import { Injectable, OnDestroy, inject } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, catchError, finalize, map, of } from 'rxjs';

import type { MarketChartSeries, MarketChartSeriesPoint } from '../../shared/models/market-chart.model';
import { ChartDataService } from '../services/chart-data.service';
import { ChartRealtimeService } from '../services/chart-realtime.service';
import { IndicatorCalculatorService } from '../technical-indicators/indicator-calculator.service';
import { TechnicalIndicatorsService } from '../technical-indicators/technical-indicators.service';
import {
  filterChartInstruments,
  getReferenceChartInstruments
} from './charting.mapper';
import type {
  ChartInstrument,
  ChartPoint,
  ChartRenderType,
  ChartTimePeriod,
  ChartViewModel,
  ComparisonSeries,
  DrawingTool,
  IndicatorType,
  TechnicalIndicatorConfig
} from './charting.models';

type ChartState = Omit<ChartViewModel, 'series' | 'instrumentOptions' | 'comparisonOptions'> & {
  instrumentOptions: ChartInstrument[];
  comparisonOptions: ChartInstrument[];
  fromDate?: string;
  toDate?: string;
};

const COMPARISON_COLORS = ['#60a5fa', '#f6c55b', '#ff7d7d', '#a78bfa', '#34d399', '#f97316'];

const initialState: ChartState = {
  selectedInstrument: null,
  instrumentOptions: getReferenceChartInstruments().slice(0, 18),
  comparisonOptions: getReferenceChartInstruments().slice(0, 18),
  timePeriod: 'INTRADAY',
  chartType: 'LINE',
  chartData: [],
  indicators: [],
  comparisonSeries: [],
  showVolume: true,
  comparisonEnabled: false,
  lineStudiesEnabled: false,
  activeDrawingTool: 'NONE',
  loading: false
};

@Injectable()
export class ChartingFacade implements OnDestroy {
  private readonly chartDataService = inject(ChartDataService);
  private readonly realtimeService = inject(ChartRealtimeService);
  private readonly indicatorCalculator = inject(IndicatorCalculatorService);
  readonly technicalIndicators = inject(TechnicalIndicatorsService);

  private readonly stateSubject = new BehaviorSubject<ChartViewModel>(this.toViewModel(initialState));
  private currentState: ChartState = initialState;
  private realtimeSubscription?: Subscription;
  private readonly comparisonRealtimeSubscriptions = new Map<string, Subscription>();

  readonly vm$ = this.stateSubject.asObservable();
  readonly indicatorDefinitions = this.technicalIndicators.definitions;

  updateInstrumentQuery(query: string): void {
    this.patch({ instrumentOptions: filterChartInstruments(query) });
  }

  updateComparisonQuery(query: string): void {
    this.patch({ comparisonOptions: filterChartInstruments(query) });
  }

  selectInstrument(instrument: ChartInstrument): void {
    this.realtimeSubscription?.unsubscribe();
    this.clearComparisonRealtime();
    this.patch({
      selectedInstrument: instrument,
      chartData: [],
      comparisonSeries: [],
      lastPrice: undefined,
      lastUpdated: undefined,
      error: undefined
    });
    this.loadHistoricalData();
    this.subscribeRealtime(instrument);
  }

  updateTimePeriod(timePeriod: ChartTimePeriod): void {
    this.patch({ timePeriod });
    this.loadHistoricalData();
    this.reloadComparisons();
  }

  updateCustomRange(fromDate: string, toDate: string): void {
    this.patch({ fromDate, toDate });

    if (this.currentState.timePeriod === 'CUSTOM') {
      this.loadHistoricalData();
      this.reloadComparisons();
    }
  }

  updateChartType(chartType: ChartRenderType): void {
    this.patch({ chartType });
  }

  toggleVolume(showVolume: boolean): void {
    this.patch({ showVolume });
  }

  toggleComparison(comparisonEnabled: boolean): void {
    this.patch({ comparisonEnabled });
  }

  toggleLineStudies(lineStudiesEnabled: boolean): void {
    this.patch({
      lineStudiesEnabled,
      activeDrawingTool: lineStudiesEnabled ? this.currentState.activeDrawingTool : 'NONE'
    });
  }

  selectDrawingTool(activeDrawingTool: DrawingTool): void {
    this.patch({ activeDrawingTool });
  }

  addIndicator(config: TechnicalIndicatorConfig): void {
    this.patch({ indicators: [...this.currentState.indicators, config] });
  }

  addIndicatorByType(type: IndicatorType): void {
    this.addIndicator(this.technicalIndicators.createConfig(type));
  }

  removeIndicator(indicatorId: string): void {
    this.patch({
      indicators: this.currentState.indicators.filter((indicator) => indicator.id !== indicatorId)
    });
  }

  addComparison(instrument: ChartInstrument): void {
    if (!this.currentState.selectedInstrument || isSameInstrument(this.currentState.selectedInstrument, instrument)) {
      return;
    }

    if (this.currentState.comparisonSeries.some((series) => isSameInstrument(series.instrument, instrument))) {
      return;
    }

    const color = COMPARISON_COLORS[this.currentState.comparisonSeries.length % COMPARISON_COLORS.length];

    this.loadDataForInstrument(instrument)
      .pipe(catchError(() => of([])))
      .subscribe((data) => {
        this.patch({
          comparisonSeries: [
            ...this.currentState.comparisonSeries,
            {
              instrument,
              data,
              color
            }
          ]
        });
        this.subscribeComparisonRealtime(instrument, color);
      });
  }

  removeComparison(instrument: ChartInstrument): void {
    const key = instrumentKey(instrument);
    this.comparisonRealtimeSubscriptions.get(key)?.unsubscribe();
    this.comparisonRealtimeSubscriptions.delete(key);

    this.patch({
      comparisonSeries: this.currentState.comparisonSeries.filter((series) => !isSameInstrument(series.instrument, instrument))
    });
  }

  resetChart(): void {
    const selectedInstrument = this.currentState.selectedInstrument;

    this.patch({
      indicators: [],
      comparisonSeries: [],
      comparisonEnabled: false,
      lineStudiesEnabled: false,
      activeDrawingTool: 'NONE',
      error: undefined
    });
    this.clearComparisonRealtime();

    if (selectedInstrument) {
      this.loadHistoricalData();
    }
  }

  ngOnDestroy(): void {
    this.realtimeSubscription?.unsubscribe();
    this.clearComparisonRealtime();
  }

  private loadHistoricalData(): void {
    const instrument = this.currentState.selectedInstrument;

    if (!instrument) {
      return;
    }

    if (this.currentState.timePeriod === 'CUSTOM' && (!this.currentState.fromDate || !this.currentState.toDate)) {
      this.patch({ error: 'Select From and To dates for custom range.' });
      return;
    }

    this.patch({ loading: true, error: undefined });

    this.loadDataForInstrument(instrument)
      .pipe(
        catchError((error: unknown) => {
          this.patch({
            chartData: [],
            error: resolveErrorMessage(error, 'Unable to load historical chart data.')
          });
          return of([]);
        }),
        finalize(() => this.patch({ loading: false }))
      )
      .subscribe((chartData) => {
        this.patch({
          chartData,
          lastPrice: chartData.at(-1)?.close,
          lastUpdated: Date.now()
        });
      });
  }

  private loadDataForInstrument(instrument: ChartInstrument): Observable<ChartPoint[]> {
    const request = {
      instrument,
      timePeriod: this.currentState.timePeriod,
      fromDate: this.currentState.fromDate,
      toDate: this.currentState.toDate
    };

    return instrument.type === 'INDEX'
      ? this.chartDataService.getIndexChartData(request)
      : this.chartDataService.getSymbolChartData(request);
  }

  private reloadComparisons(): void {
    const comparisons = [...this.currentState.comparisonSeries];
    this.patch({ comparisonSeries: [] });
    this.clearComparisonRealtime();

    for (const series of comparisons) {
      this.addComparison(series.instrument);
    }
  }

  private subscribeRealtime(instrument: ChartInstrument): void {
    this.realtimeSubscription = this.realtimeService
      .observeInstrument(instrument)
      .pipe(
        catchError((error: unknown) => {
          this.patch({ error: resolveErrorMessage(error, 'Realtime chart feed is unavailable.') });
          return of(null);
        })
      )
      .subscribe((point) => {
        if (point) {
          this.appendRealtimePoint(point);
        }
      });
  }

  private subscribeComparisonRealtime(instrument: ChartInstrument, color: string): void {
    const key = instrumentKey(instrument);
    this.comparisonRealtimeSubscriptions.get(key)?.unsubscribe();

    const subscription = this.realtimeService
      .observeInstrument(instrument)
      .pipe(catchError(() => of(null)))
      .subscribe((point) => {
        if (point) {
          this.appendComparisonPoint(instrument, point, color);
        }
      });

    this.comparisonRealtimeSubscriptions.set(key, subscription);
  }

  private appendRealtimePoint(point: ChartPoint): void {
    const chartData = appendPoint(this.currentState.chartData, point);

    this.patch({
      chartData,
      lastPrice: point.close,
      lastUpdated: Date.now()
    });
  }

  private appendComparisonPoint(instrument: ChartInstrument, point: ChartPoint, color: string): void {
    this.patch({
      comparisonSeries: this.currentState.comparisonSeries.map((series) =>
        isSameInstrument(series.instrument, instrument)
          ? {
              ...series,
              color,
              data: appendPoint(series.data, point)
            }
          : series
      )
    });
  }

  private clearComparisonRealtime(): void {
    for (const subscription of this.comparisonRealtimeSubscriptions.values()) {
      subscription.unsubscribe();
    }

    this.comparisonRealtimeSubscriptions.clear();
  }

  private patch(partial: Partial<ChartState>): void {
    this.currentState = {
      ...this.currentState,
      ...partial
    };
    this.stateSubject.next(this.toViewModel(this.currentState));
  }

  private toViewModel(state: ChartState): ChartViewModel {
    return {
      ...state,
      series: this.buildSeries(state)
    };
  }

  private buildSeries(state: ChartState): MarketChartSeries[] {
    const primarySeries = state.selectedInstrument && state.chartData.length > 0
      ? [toSeries(state.selectedInstrument.name || state.selectedInstrument.id, state.chartData, state.chartType, '#18dcc1')]
      : [];
    const indicatorSeries = this.indicatorCalculator.calculateSeries(state.chartData, state.indicators);
    const volumeSeries = state.showVolume
      ? [
          {
            id: 'volume',
            label: 'Volume',
            points: state.chartData.map(toSeriesPoint),
            type: 'bar' as const,
            xKey: 'time',
            yKey: 'volume',
            yAxisKey: 'volume',
            color: '#64748b'
          }
        ]
      : [];
    const comparisonSeries = state.comparisonSeries.map((series) =>
      toSeries(series.instrument.name || series.instrument.id, series.data, 'LINE', series.color)
    );

    return [...primarySeries, ...comparisonSeries, ...indicatorSeries, ...volumeSeries];
  }
}

function toSeries(label: string, data: readonly ChartPoint[], chartType: ChartRenderType, color?: string): MarketChartSeries {
  return {
    id: label,
    label,
    points: data.map(toSeriesPoint),
    type: chartType === 'AREA' ? 'area' : chartType === 'BAR' ? 'bar' : 'line',
    xKey: 'time',
    yKey: 'close',
    color
  };
}

function toSeriesPoint(point: ChartPoint): MarketChartSeriesPoint {
  return {
    time: point.time,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    value: point.close,
    volume: point.volume ?? 0
  };
}

function appendPoint(points: readonly ChartPoint[], point: ChartPoint): ChartPoint[] {
  const next = [...points];
  const last = next.at(-1);

  if (last && last.time === point.time) {
    next[next.length - 1] = point;
  } else {
    next.push(point);
  }

  return next.slice(-3_000);
}

function isSameInstrument(left: ChartInstrument, right: ChartInstrument): boolean {
  return left.type === right.type && left.market === right.market && left.id === right.id;
}

function instrumentKey(instrument: ChartInstrument): string {
  return `${instrument.type}:${instrument.market}:${instrument.id}`;
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

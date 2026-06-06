import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  switchMap
} from 'rxjs';

import { MarketPerformanceService, PerformancePeriod } from '../services/market-performance.service';
import { IndicatorCalculatorService } from '../technical-indicators/indicator-calculator.service';
import { TechnicalIndicatorConfig } from '../technical-indicators/indicator.models';
import { mapIndexRowsToChartData } from './indices-performance.mapper';
import { IndicesPerformanceViewModel } from './indices-performance.models';

const DEFAULT_PERIOD: PerformancePeriod = '1M';

interface IndicesPerformanceState {
  selectedIndexId: string | null;
  selectedPeriod: PerformancePeriod;
  indicators: TechnicalIndicatorConfig[];
  comparisonEnabled: boolean;
  comparisonIds: string[];
  showVolume: boolean;
  loadRequestId: number;
  validationError?: string;
}

@Injectable()
export class IndicesPerformanceFacade {
  private readonly service = inject(MarketPerformanceService);
  private readonly calculator = inject(IndicatorCalculatorService);
  private readonly stateSubject = new BehaviorSubject<IndicesPerformanceState>({
    selectedIndexId: null,
    selectedPeriod: DEFAULT_PERIOD,
    indicators: [],
    comparisonEnabled: false,
    comparisonIds: [],
    showVolume: true,
    loadRequestId: 0
  });
  private readonly indexQuerySubject = new BehaviorSubject('');
  private readonly comparisonQuerySubject = new BehaviorSubject('');

  readonly indexOptions$ = this.indexQuerySubject.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((query) => this.service.getIndexOptions(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly comparisonOptions$ = this.comparisonQuerySubject.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((query) => this.service.getIndexOptions(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$: Observable<IndicesPerformanceViewModel> = this.stateSubject.pipe(
    switchMap((state) =>
      this.indexOptions$.pipe(
        switchMap((indexOptions) => {
          const selectedIndex = indexOptions.find((option) => option.indexId === state.selectedIndexId) ?? null;

          if (!state.loadRequestId || !state.selectedIndexId || state.validationError) {
            return of({
              selectedIndex,
              selectedPeriod: state.selectedPeriod,
              indexOptions,
              rows: [],
              chartData: [],
              indicators: state.indicators,
              comparisonSeries: [],
              showVolume: state.showVolume,
              comparisonEnabled: state.comparisonEnabled,
              loading: false,
              validationError: state.validationError
            } satisfies IndicesPerformanceViewModel);
          }

          const selectedIndexId = state.selectedIndexId;

          return this.service
            .getIndexPerformance({
              itemId: selectedIndexId,
              period: state.selectedPeriod
            })
            .pipe(
              switchMap((rows) => {
                const chartData = mapIndexRowsToChartData(rows);
                const indicatorSeries = this.calculator.calculate(chartData, state.indicators);

                if (!state.comparisonEnabled || state.comparisonIds.length === 0) {
                  return of({
                    selectedIndex,
                    selectedPeriod: state.selectedPeriod,
                    indexOptions,
                    rows,
                    chartData,
                    indicators: state.indicators,
                    indicatorSeries,
                    comparisonSeries: [],
                    showVolume: state.showVolume,
                    comparisonEnabled: state.comparisonEnabled,
                    loading: false
                  });
                }

                return this.service
                  .getComparisonPerformance({
                    itemId: selectedIndexId,
                    itemType: 'INDEX',
                    comparisonIds: state.comparisonIds,
                    period: state.selectedPeriod
                  })
                  .pipe(
                    map((comparisonSeries) => ({
                      selectedIndex,
                      selectedPeriod: state.selectedPeriod,
                      indexOptions,
                      rows,
                      chartData,
                      indicators: state.indicators,
                      indicatorSeries,
                      comparisonSeries,
                      showVolume: state.showVolume,
                      comparisonEnabled: state.comparisonEnabled,
                      loading: false
                    }))
                  );
              }),
              catchError((error) =>
                of({
                  selectedIndex,
                  selectedPeriod: state.selectedPeriod,
                  indexOptions,
                  rows: [],
                  chartData: [],
                  indicators: state.indicators,
                  comparisonSeries: [],
                  showVolume: state.showVolume,
                  comparisonEnabled: state.comparisonEnabled,
                  loading: false,
                  error: error instanceof Error ? error.message : 'Unable to load index performance.'
                } satisfies IndicesPerformanceViewModel)
              )
            );
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateIndexQuery(query: string): void {
    this.indexQuerySubject.next(query);
  }

  updateComparisonQuery(query: string): void {
    this.comparisonQuerySubject.next(query);
  }

  selectIndex(indexId: string): void {
    this.patch({ selectedIndexId: indexId, validationError: undefined });
  }

  selectPeriod(period: PerformancePeriod): void {
    this.patch({ selectedPeriod: period, validationError: undefined });
  }

  showChart(): void {
    const state = this.stateSubject.value;

    if (!state.selectedIndexId) {
      this.patch({ validationError: 'Index is required.' });
      return;
    }

    if (!state.selectedPeriod) {
      this.patch({ validationError: 'Time period is required.' });
      return;
    }

    this.patch({ loadRequestId: Date.now(), validationError: undefined });
  }

  addIndicator(indicator: TechnicalIndicatorConfig): void {
    this.patch({ indicators: [...this.stateSubject.value.indicators, indicator] });
  }

  removeIndicator(id: string): void {
    this.patch({ indicators: this.stateSubject.value.indicators.filter((indicator) => indicator.id !== id) });
  }

  toggleVolume(showVolume: boolean): void {
    this.patch({ showVolume });
  }

  toggleComparison(comparisonEnabled: boolean): void {
    this.patch({ comparisonEnabled });
  }

  addComparison(indexId: string): void {
    if (!indexId || indexId === this.stateSubject.value.selectedIndexId) {
      return;
    }

    this.patch({
      comparisonEnabled: true,
      comparisonIds: Array.from(new Set([...this.stateSubject.value.comparisonIds, indexId]))
    });
  }

  removeComparison(indexId: string): void {
    this.patch({
      comparisonIds: this.stateSubject.value.comparisonIds.filter((id) => id !== indexId)
    });
  }

  resetChart(): void {
    this.patch({ indicators: [], comparisonIds: [], comparisonEnabled: false, showVolume: true });
  }

  private patch(patch: Partial<IndicesPerformanceState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch
    });
  }
}

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

import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { MarketPerformanceService, PerformancePeriod } from '../services/market-performance.service';
import { IndicatorCalculatorService } from '../technical-indicators/indicator-calculator.service';
import type { TechnicalIndicatorConfig } from '../technical-indicators/indicator.models';
import { mapSecurityRowsToChartData } from './security-performance.mapper';
import type { SecurityPerformanceViewModel } from './security-performance.models';

const DEFAULT_PERIOD: PerformancePeriod = '1M';

interface SecurityPerformanceState {
  selectedSecurityId: string | null;
  selectedPeriod: PerformancePeriod;
  indicators: TechnicalIndicatorConfig[];
  comparisonEnabled: boolean;
  comparisonIds: string[];
  showVolume: boolean;
  loadRequestId: number;
  validationError?: string;
}

@Injectable()
export class SecurityPerformanceFacade {
  private readonly service = inject(MarketPerformanceService);
  private readonly calculator = inject(IndicatorCalculatorService);
  private readonly stateSubject = new BehaviorSubject<SecurityPerformanceState>({
    selectedSecurityId: null,
    selectedPeriod: DEFAULT_PERIOD,
    indicators: [],
    comparisonEnabled: false,
    comparisonIds: [],
    showVolume: true,
    loadRequestId: 0
  });
  private readonly securityQuerySubject = new BehaviorSubject('');
  private readonly comparisonQuerySubject = new BehaviorSubject('');
  private readonly settings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'security-performance'
  };

  readonly securityOptions$ = this.securityQuerySubject.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((query) => this.service.getSecurityOptions(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly comparisonOptions$ = this.comparisonQuerySubject.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((query) => this.service.getSecurityOptions(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$: Observable<SecurityPerformanceViewModel> = this.stateSubject.pipe(
    switchMap((state) =>
      this.securityOptions$.pipe(
        switchMap((securityOptions) => {
          const selectedSecurity =
            securityOptions.find((option) => option.symbolId === state.selectedSecurityId) ?? null;

          if (!state.loadRequestId || !state.selectedSecurityId || state.validationError) {
            return of({
              selectedSecurity,
              selectedPeriod: state.selectedPeriod,
              securityOptions,
              rows: [],
              chartData: [],
              indicators: state.indicators,
              comparisonSeries: [],
              showVolume: state.showVolume,
              comparisonEnabled: state.comparisonEnabled,
              loading: false,
              settings: this.settings,
              validationError: state.validationError
            } satisfies SecurityPerformanceViewModel);
          }

          const selectedSecurityId = state.selectedSecurityId;

          return this.service
            .getSecurityPerformance({
              itemId: selectedSecurityId,
              period: state.selectedPeriod
            })
            .pipe(
              switchMap((rows) => {
                const chartData = mapSecurityRowsToChartData(rows);
                const indicatorSeries = this.calculator.calculate(chartData, state.indicators);

                if (!state.comparisonEnabled || state.comparisonIds.length === 0) {
                  return of({
                    selectedSecurity,
                    selectedPeriod: state.selectedPeriod,
                    securityOptions,
                    rows,
                    chartData,
                    indicators: state.indicators,
                    indicatorSeries,
                    comparisonSeries: [],
                    showVolume: state.showVolume,
                    comparisonEnabled: state.comparisonEnabled,
                    loading: false,
                    settings: this.settings
                  } satisfies SecurityPerformanceViewModel);
                }

                return this.service
                  .getComparisonPerformance({
                    itemId: selectedSecurityId,
                    itemType: 'SECURITY',
                    comparisonIds: state.comparisonIds,
                    period: state.selectedPeriod
                  })
                  .pipe(
                    map((comparisonSeries) => ({
                      selectedSecurity,
                      selectedPeriod: state.selectedPeriod,
                      securityOptions,
                      rows,
                      chartData,
                      indicators: state.indicators,
                      indicatorSeries,
                      comparisonSeries,
                      showVolume: state.showVolume,
                      comparisonEnabled: state.comparisonEnabled,
                      loading: false,
                      settings: this.settings
                    }))
                  );
              }),
              catchError((error) =>
                of({
                  selectedSecurity,
                  selectedPeriod: state.selectedPeriod,
                  securityOptions,
                  rows: [],
                  chartData: [],
                  indicators: state.indicators,
                  comparisonSeries: [],
                  showVolume: state.showVolume,
                  comparisonEnabled: state.comparisonEnabled,
                  loading: false,
                  settings: this.settings,
                  error: error instanceof Error ? error.message : 'Unable to load security performance.'
                } satisfies SecurityPerformanceViewModel)
              )
            );
        })
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateSecurityQuery(query: string): void {
    this.securityQuerySubject.next(query);
  }

  updateComparisonQuery(query: string): void {
    this.comparisonQuerySubject.next(query);
  }

  selectSecurity(symbolId: string): void {
    this.patch({ selectedSecurityId: symbolId, validationError: undefined });
  }

  selectPeriod(period: PerformancePeriod): void {
    this.patch({ selectedPeriod: period, validationError: undefined });
  }

  showChart(): void {
    const state = this.stateSubject.value;

    if (!state.selectedSecurityId) {
      this.patch({ validationError: 'Symbol is required.' });
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

  addComparison(symbolId: string): void {
    if (!symbolId || symbolId === this.stateSubject.value.selectedSecurityId) {
      return;
    }

    this.patch({
      comparisonEnabled: true,
      comparisonIds: Array.from(new Set([...this.stateSubject.value.comparisonIds, symbolId]))
    });
  }

  removeComparison(symbolId: string): void {
    this.patch({
      comparisonIds: this.stateSubject.value.comparisonIds.filter((id) => id !== symbolId)
    });
  }

  resetChart(): void {
    this.patch({ indicators: [], comparisonIds: [], comparisonEnabled: false, showVolume: true });
  }

  private patch(patch: Partial<SecurityPerformanceState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch
    });
  }
}

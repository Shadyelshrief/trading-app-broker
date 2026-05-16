import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { createHistoricalTopSymbolsColumns } from './historical-top-symbols.columns';
import {
  HISTORICAL_TOP_SYMBOLS_MARKET_OPTIONS,
  HISTORICAL_TOP_SYMBOLS_VIEW_OPTIONS
} from './historical-top-symbols.filters';
import {
  sortHistoricalTopSymbols,
  validateHistoricalTopSymbolsFilters
} from './historical-top-symbols.mapper';
import {
  HistoricalTopSymbolsFilters,
  HistoricalTopSymbolsViewKey,
  HistoricalTopSymbolsViewModel
} from './historical-top-symbols.models';
import { HistoricalTopSymbolsService } from './historical-top-symbols.service';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  highlightColor: '#f6c55b',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'historical-top-symbols'
};

const DEFAULT_FILTERS: HistoricalTopSymbolsFilters = {
  market: 'adx',
  selectedView: 'MOST_ACTIVE_VOLUME',
  numberOfSymbols: 10,
  fromDate: getDefaultFromDate(),
  toDate: getDefaultToDate()
};

const SETTINGS_STORAGE_KEY = 'historical-top-symbols-settings-v1';

@Injectable()
export class HistoricalTopSymbolsFacade {
  private readonly service = inject(HistoricalTopSymbolsService);
  private readonly filtersSubject = new BehaviorSubject<HistoricalTopSymbolsFilters>(DEFAULT_FILTERS);
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());

  readonly filters$ = this.filtersSubject.asObservable();
  readonly settings$ = this.settingsSubject.asObservable();

  readonly vm$ = combineLatest([
    this.filters$,
    this.settings$,
    this.filters$.pipe(
      switchMap((filters) => {
        const validationError = validateHistoricalTopSymbolsFilters(filters);

        if (validationError) {
          return of({
            rows: [],
            loading: false,
            validationError,
            error: undefined,
            lastLoadedAt: undefined
          });
        }

        return this.service.getHistoricalTopSymbols(filters).pipe(
          map((rows) => ({
            rows: sortHistoricalTopSymbols(rows, filters.selectedView, filters.numberOfSymbols),
            loading: false,
            validationError: undefined,
            error: undefined,
            lastLoadedAt: Date.now()
          })),
          startWith({
            rows: [],
            loading: true,
            validationError: undefined,
            error: undefined,
            lastLoadedAt: undefined
          }),
          catchError((error) =>
            of({
              rows: [],
              loading: false,
              validationError: undefined,
              error:
                error instanceof Error
                  ? error.message
                  : 'Unable to load historical top symbols.',
              lastLoadedAt: undefined
            })
          )
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  ]).pipe(
    map(([filters, settings, state]) => ({
      filters,
      marketOptions: HISTORICAL_TOP_SYMBOLS_MARKET_OPTIONS,
      viewOptions: HISTORICAL_TOP_SYMBOLS_VIEW_OPTIONS,
      rows: state.rows,
      loading: state.loading,
      error: state.error,
      validationError: state.validationError,
      lastLoadedAt: state.lastLoadedAt,
      settings
    }) satisfies HistoricalTopSymbolsViewModel),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  columns(selectedView: HistoricalTopSymbolsViewKey) {
    return createHistoricalTopSymbolsColumns(selectedView);
  }

  selectMarket(market: HistoricalTopSymbolsFilters['market']): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      market
    });
  }

  selectView(selectedView: HistoricalTopSymbolsViewKey): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      selectedView
    });
  }

  selectNumberOfSymbols(numberOfSymbols: number): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      numberOfSymbols: clampSymbolCount(numberOfSymbols)
    });
  }

  updateFromDate(fromDate: string): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      fromDate
    });
  }

  updateToDate(toDate: string): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      toDate
    });
  }

  updateSettings(patch: Partial<MarketGridSettings>): void {
    const next = { ...this.settingsSubject.value, ...patch };
    this.settingsSubject.next(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  private readStoredSettings(): MarketGridSettings {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<MarketGridSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

function clampSymbolCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 10;
  }

  if (value <= 10) {
    return 10;
  }

  if (value <= 20) {
    return 20;
  }

  if (value <= 25) {
    return 25;
  }

  return 50;
}

function getDefaultFromDate(): string {
  const date = new Date();
  date.setDate(1);
  return formatDateInput(date);
}

function getDefaultToDate(): string {
  return formatDateInput(new Date());
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

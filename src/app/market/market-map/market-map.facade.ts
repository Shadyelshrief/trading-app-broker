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

import { MarketDataService, WebSocketState } from '../../core/market-data';
import {
  MARKET_MAP_MARKET_OPTIONS,
  MARKET_MAP_SORT_CRITERIA_OPTIONS,
  MARKET_MAP_SORT_ORDER_OPTIONS
} from './market-map.filters';
import {
  applyTickPayloadsToMarketMapSymbols,
  buildMarketMapReferenceSymbols,
  buildMarketMapTopics,
  decorateMarketMapSymbols,
  mapConnectionState
} from './market-map.mapper';
import { MarketMapFilters, MarketMapSettings, MarketMapViewModel } from './market-map.models';

const DEFAULT_FILTERS: MarketMapFilters = {
  market: 'adx',
  sortOrder: 'DESC',
  sortCriteria: 'CHANGE_PERCENT'
};

const DEFAULT_SETTINGS: MarketMapSettings = {
  startColor: '#0f2135',
  endColor: '#14cba8',
  invalidSymbolColor: '#243244',
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 13
};

const SETTINGS_STORAGE_KEY = 'market-map-settings-v1';

@Injectable()
export class MarketMapFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly filtersSubject = new BehaviorSubject<MarketMapFilters>(DEFAULT_FILTERS);
  private readonly settingsSubject = new BehaviorSubject<MarketMapSettings>(this.readStoredSettings());

  readonly vm$ = combineLatest([
    this.filtersSubject,
    this.settingsSubject,
    this.filtersSubject.pipe(
      switchMap((filters) => {
        const referenceSymbols = buildMarketMapReferenceSymbols(filters.market);
        const topics = buildMarketMapTopics(filters.market);

        return combineLatest([
          topics.length > 0
            ? this.marketData.observeMany<unknown>(topics).pipe(
                startWith({} as Record<string, unknown>),
                catchError((error) =>
                  of({
                    __error: error instanceof Error ? error.message : 'Unable to load market map.'
                  } as Record<string, unknown>)
                )
              )
            : of({} as Record<string, unknown>),
          this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
        ]).pipe(
          map(([payloads, socketState]) => {
            const rows = applyTickPayloadsToMarketMapSymbols(referenceSymbols, payloads);

            return {
              rows,
              loading: rows.every((row) => !row.valid) && socketState?.status !== 'disconnected',
              error: typeof payloads['__error'] === 'string' ? payloads['__error'] : undefined,
              connectionState: mapConnectionState(socketState),
              lastUpdated: rows.reduce<number | undefined>(
                (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
                undefined
              )
            };
          })
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  ]).pipe(
    map(([filters, settings, feedState]) => ({
      filters,
      marketOptions: MARKET_MAP_MARKET_OPTIONS,
      sortOrderOptions: MARKET_MAP_SORT_ORDER_OPTIONS,
      sortCriteriaOptions: MARKET_MAP_SORT_CRITERIA_OPTIONS,
      symbols: decorateMarketMapSymbols(feedState.rows, filters, settings),
      settings,
      loading: feedState.loading,
      error: feedState.error,
      connectionState: feedState.connectionState,
      lastUpdated: feedState.lastUpdated
    }) satisfies MarketMapViewModel),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectMarket(market: MarketMapFilters['market']): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      market
    });
  }

  selectSortOrder(sortOrder: MarketMapFilters['sortOrder']): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      sortOrder
    });
  }

  selectSortCriteria(sortCriteria: MarketMapFilters['sortCriteria']): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      sortCriteria
    });
  }

  updateSettings(patch: Partial<MarketMapSettings>): void {
    const next = { ...this.settingsSubject.value, ...patch };
    this.settingsSubject.next(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  private readStoredSettings(): MarketMapSettings {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<MarketMapSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

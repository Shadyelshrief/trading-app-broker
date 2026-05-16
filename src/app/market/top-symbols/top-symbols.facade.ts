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
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { createTopSymbolsColumns } from './top-symbols.columns';
import {
  getSupportedTopSymbolExchanges,
  TOP_SYMBOLS_MARKET_OPTIONS,
  TOP_SYMBOLS_VIEW_OPTIONS
} from './top-symbols.filters';
import {
  buildTopSymbolsTickTopics,
  buildTopSymbolsReferenceLookup,
  buildTopSymbolsTopic,
  mapConnectionLabel,
  mapConnectionState,
  mapTopSymbolsPayload,
  mapTopSymbolsTickPayloads,
  mergeTopSymbolsRows,
  sortTopSymbolRows
} from './top-symbols.mapper';
import { TopSymbolsFilters, TopSymbolsViewKey, TopSymbolsViewModel } from './top-symbols.models';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  highlightColor: '#f6c55b',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'top-symbols'
};

const DEFAULT_FILTERS: TopSymbolsFilters = {
  market: 'adx',
  selectedView: 'MOST_ACTIVE_VOLUME',
  numberOfSymbols: 10
};

const SETTINGS_STORAGE_KEY = 'top-symbols-settings-v1';

@Injectable()
export class TopSymbolsFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly filtersSubject = new BehaviorSubject<TopSymbolsFilters>(DEFAULT_FILTERS);
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());
  private readonly referenceLookup = buildTopSymbolsReferenceLookup();

  readonly filters$ = this.filtersSubject.asObservable();
  readonly settings$ = this.settingsSubject.asObservable();

  readonly vm$ = combineLatest([
    this.filters$,
    this.settings$,
    this.filters$.pipe(
      map((filters) => filters.market),
      switchMap((market) => {
        const exchanges = getSupportedTopSymbolExchanges(market);
        const topics = exchanges.map((exchange) => buildTopSymbolsTopic(exchange));
        const tickTopics = exchanges.flatMap((exchange) => buildTopSymbolsTickTopics(exchange));

        return combineLatest([
          topics.length > 0
            ? this.marketData.observeMany<unknown>(topics).pipe(
                startWith({} as Record<string, unknown>),
                catchError((error) =>
                  of({
                    __error: error instanceof Error ? error.message : 'Unable to load top symbols.'
                  } as Record<string, unknown>)
                )
              )
            : of({} as Record<string, unknown>),
          tickTopics.length > 0
            ? this.marketData.observeMany<unknown>(tickTopics).pipe(
                startWith({} as Record<string, unknown>),
                catchError(() => of({} as Record<string, unknown>))
              )
            : of({} as Record<string, unknown>),
          this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
        ]).pipe(
          map(([payloads, tickPayloads, socketState]) => {
            const primaryRows = topics.flatMap((topic) =>
              mapTopSymbolsPayload(payloads[topic], extractExchange(topic), this.referenceLookup)
            );
            const fallbackRows = mapTopSymbolsTickPayloads(tickPayloads, this.referenceLookup);
            const mergedRows = mergeTopSymbolsRows(primaryRows, fallbackRows);

            return {
              baseRows: mergedRows,
              loading: mergedRows.length === 0 && socketState?.status !== 'disconnected',
              error: typeof payloads['__error'] === 'string' ? payloads['__error'] : undefined,
              connectionState: mapConnectionState(socketState),
              lastUpdated: mergedRows.reduce<number | undefined>(
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
      marketOptions: TOP_SYMBOLS_MARKET_OPTIONS,
      viewOptions: TOP_SYMBOLS_VIEW_OPTIONS,
      rows: sortTopSymbolRows(feedState.baseRows, filters.selectedView, filters.numberOfSymbols),
      loading: feedState.loading,
      error: feedState.error,
      connectionState: feedState.connectionState,
      connectionLabel: mapConnectionLabel(feedState.connectionState),
      lastUpdated: feedState.lastUpdated,
      settings
    }) satisfies TopSymbolsViewModel),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  columns(selectedView: TopSymbolsViewKey) {
    return createTopSymbolsColumns(selectedView);
  }

  selectMarket(market: TopSymbolsFilters['market']): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      market
    });
  }

  selectView(selectedView: TopSymbolsViewKey): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      selectedView
    });
  }

  selectNumberOfSymbols(numberOfSymbols: number): void {
    const safeValue = clampSymbolCount(numberOfSymbols);

    this.filtersSubject.next({
      ...this.filtersSubject.value,
      numberOfSymbols: safeValue
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

function extractExchange(topic: string): string {
  const [, exchange] = topic.split(':');
  return exchange ?? 'adx';
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

  if (value <= 30) {
    return 30;
  }

  return 50;
}

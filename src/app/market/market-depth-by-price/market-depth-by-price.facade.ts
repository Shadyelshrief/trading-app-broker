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
import { buildMbpTopic } from '../../shared/utils/market-depth-topic.util';
import {
  filterSharedSymbolOptions,
  findSharedSymbolOption,
  getSharedSymbolOptions
} from '../../shared/utils/symbol-reference.util';
import {
  mapConnectionLabel,
  mapConnectionState,
  mapMbpMessageToDepthViewModel
} from './market-depth-by-price.mapper';
import { MarketDepthViewModel, SymbolOption } from './market-depth-by-price.models';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'market-depth-by-price'
};

const SETTINGS_STORAGE_KEY = 'market-depth-by-price-settings-v1';
const DEFAULT_SYMBOL = findSharedSymbolOption('IHC', 'ADX') ?? getSharedSymbolOptions()[0];
const DEFAULT_SYMBOL_LABEL = `${DEFAULT_SYMBOL.symbolId} - ${DEFAULT_SYMBOL.symbolName}`;

@Injectable()
export class MarketDepthByPriceFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly symbolSubject = new BehaviorSubject<SymbolOption>(DEFAULT_SYMBOL);
  private readonly symbolQuerySubject = new BehaviorSubject<string>(DEFAULT_SYMBOL_LABEL);
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());

  readonly vm$ = combineLatest([
    this.symbolSubject,
    this.symbolQuerySubject,
    this.settingsSubject,
    this.symbolSubject.pipe(
      switchMap((symbol) => {
        const topic = buildMbpTopic(symbol.market, symbol.symbolId);

        return combineLatest([
          this.marketData.observe<unknown>(topic).pipe(
            startWith(undefined),
            catchError((error) =>
              of({
                __error: error instanceof Error ? error.message : 'Unable to load market depth by price.'
              })
            )
          ),
          this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
        ]).pipe(
          map(([payload, connectionState]) => {
            const connection = mapConnectionState(connectionState);
            const book =
              payload === undefined
                ? null
                : payload && typeof payload === 'object' && '__error' in payload
                  ? null
                  : mapMbpMessageToDepthViewModel(payload);

            return {
              symbol,
              connectionState: connection,
              connectionLabel: mapConnectionLabel(connection),
              book,
              error:
                payload && typeof payload === 'object' && '__error' in payload
                  ? String((payload as Record<string, unknown>)['__error'])
                  : undefined
            };
          })
        );
      })
    )
  ]).pipe(
    map(([symbol, query, settings, feedState]) => ({
      symbolId: symbol.symbolId,
      symbolName: symbol.symbolName,
      market: symbol.market,
      currency: symbol.currency,
      bids: feedState.book?.bids ?? [],
      offers: feedState.book?.offers ?? [],
      totalBidQuantity: feedState.book?.totalBidQuantity ?? 0,
      totalBidOrders: feedState.book?.totalBidOrders ?? 0,
      totalOfferQuantity: feedState.book?.totalOfferQuantity ?? 0,
      totalOfferOrders: feedState.book?.totalOfferOrders ?? 0,
      loading: !feedState.book && !feedState.error,
      error: feedState.error,
      connectionState: feedState.connectionState,
      connectionLabel: feedState.connectionLabel,
      lastUpdated: feedState.book?.lastUpdated,
      settings,
      symbolOptions: getSharedSymbolOptions(),
      filteredSymbolOptions: filterSharedSymbolOptions(query)
    }) satisfies MarketDepthViewModel),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectSymbol(symbol: SymbolOption | null): void {
    if (!symbol) {
      return;
    }

    this.symbolSubject.next(symbol);
    this.symbolQuerySubject.next(`${symbol.symbolId} - ${symbol.symbolName}`);
  }

  updateSymbolQuery(query: string): void {
    this.symbolQuerySubject.next(query);
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

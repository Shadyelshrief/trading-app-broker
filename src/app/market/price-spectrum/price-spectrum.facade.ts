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
import { buildMbpTopic } from '../../shared/utils/market-depth-topic.util';
import { mapMbpMessageToDepthBook } from '../../shared/utils/market-depth.mapper';
import {
  filterSharedSymbolOptions,
  findSharedSymbolOption,
  getSharedSymbolOptions
} from '../../shared/utils/symbol-reference.util';
import {
  mapConnectionState,
  mapDepthBookToPriceSpectrumRows
} from './price-spectrum.mapper';
import {
  PriceSpectrumSettings,
  PriceSpectrumViewModel,
  SymbolOption
} from './price-spectrum.models';

const DEFAULT_SETTINGS: PriceSpectrumSettings = {
  bidBackgroundColor: 'rgba(61, 220, 151, 0.12)',
  bidRatioColor: '#3ddc97',
  offerBackgroundColor: 'rgba(255, 125, 125, 0.12)',
  offerRatioColor: '#ff7d7d',
  fontFamily: 'IBM Plex Sans, sans-serif',
  fontSize: 13
};

const SETTINGS_STORAGE_KEY = 'price-spectrum-settings-v1';
const DEFAULT_SYMBOL = findSharedSymbolOption('IHC', 'ADX') ?? getSharedSymbolOptions()[0];
const DEFAULT_SYMBOL_LABEL = `${DEFAULT_SYMBOL.symbolId} - ${DEFAULT_SYMBOL.symbolName}`;

@Injectable()
export class PriceSpectrumFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly symbolSubject = new BehaviorSubject<SymbolOption>(DEFAULT_SYMBOL);
  private readonly symbolQuerySubject = new BehaviorSubject<string>(DEFAULT_SYMBOL_LABEL);
  private readonly settingsSubject = new BehaviorSubject<PriceSpectrumSettings>(this.readStoredSettings());

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
                __error: error instanceof Error ? error.message : 'Unable to load price spectrum.'
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
                  : mapMbpMessageToDepthBook(payload);

            return {
              symbol,
              connectionState: connection,
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
      rows: feedState.book ? mapDepthBookToPriceSpectrumRows(feedState.book) : [],
      totalBidQuantity: feedState.book?.totalBidQuantity ?? 0,
      totalBidOrders: feedState.book?.totalBidOrders ?? 0,
      totalOfferQuantity: feedState.book?.totalOfferQuantity ?? 0,
      totalOfferOrders: feedState.book?.totalOfferOrders ?? 0,
      loading: !feedState.book && !feedState.error,
      error: feedState.error,
      connectionState: feedState.connectionState,
      lastUpdated: feedState.book?.lastUpdated,
      settings,
      symbolOptions: getSharedSymbolOptions(),
      filteredSymbolOptions: filterSharedSymbolOptions(query)
    }) satisfies PriceSpectrumViewModel),
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

  updateSettings(patch: Partial<PriceSpectrumSettings>): void {
    const next = { ...this.settingsSubject.value, ...patch };
    this.settingsSubject.next(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  private readStoredSettings(): PriceSpectrumSettings {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<PriceSpectrumSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

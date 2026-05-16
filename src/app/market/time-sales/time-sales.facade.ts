import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  merge,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { createTimeSalesColumns } from './time-sales.columns';
import {
  filterSymbolOptions,
  getSymbolOptionsForMarket,
  TIME_SALES_MARKET_OPTIONS,
  TIME_SALES_SYMBOL_OPTIONS
} from './time-sales.filters';
import {
  applyTimeSalesFilters,
  buildTimeSalesTopics,
  mapConnectionLabel,
  mapConnectionState,
  mapTradeMessageToTimeSalesRows,
  prependTradeRows,
  symbolDisplayValue
} from './time-sales.mapper';
import {
  SymbolOption,
  TimeSalesConnectionState,
  TimeSalesFilters,
  TimeSalesMarketFilter,
  TimeSalesRow,
  TimeSalesViewModel
} from './time-sales.models';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: true,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'time-sales'
};

const DEFAULT_FILTERS: TimeSalesFilters = {
  allSymbols: true,
  symbol: null,
  symbolQuery: '',
  market: 'all',
  minQuantity: 0
};

const SETTINGS_STORAGE_KEY = 'time-sales-settings-v1';
const MAX_TRADE_ROWS = 5000;

interface TradeStreamState {
  rows: TimeSalesRow[];
  loading: boolean;
  error?: string;
  lastUpdated?: number;
}

interface SubscriptionUniverse {
  market: TimeSalesMarketFilter;
  allSymbols: boolean;
  symbolKey: string | null;
}

@Injectable()
export class TimeSalesFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly filtersSubject = new BehaviorSubject<TimeSalesFilters>(DEFAULT_FILTERS);
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());
  private readonly symbolLookup = new Map<string, SymbolOption>(
    TIME_SALES_SYMBOL_OPTIONS.map((option) => [
      `${option.marketShortName === 'TADAWUL' ? 'tadawul' : option.marketShortName.toLowerCase()}:${option.symbolId}`,
      option
    ])
  );

  readonly columns = createTimeSalesColumns();
  readonly filters$ = this.filtersSubject.asObservable();
  readonly settings$ = this.settingsSubject.asObservable();

  private readonly connectionState$ = this.marketData.getConnectionState().pipe(
    startWith(null as WebSocketState | null),
    map((state) => mapConnectionState(state)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly tradeStreamState$ = this.filters$.pipe(
    map(
      (filters): SubscriptionUniverse => ({
        market: filters.market,
        allSymbols: filters.allSymbols,
        symbolKey: filters.symbol
          ? `${filters.symbol.marketShortName === 'TADAWUL' ? 'tadawul' : filters.symbol.marketShortName.toLowerCase()}:${filters.symbol.symbolId}`
          : null
      })
    ),
    distinctUntilChanged(
      (left, right) =>
        left.market === right.market &&
        left.allSymbols === right.allSymbols &&
        left.symbolKey === right.symbolKey
    ),
    switchMap((universe) => {
      const symbol =
        universe.symbolKey !== null ? this.symbolLookup.get(universe.symbolKey) ?? null : null;
      const topics = buildTimeSalesTopics(universe.market, universe.allSymbols, symbol);

      if (topics.length === 0) {
        return of<TradeStreamState>({
          rows: [],
          loading: false,
          lastUpdated: undefined
        });
      }

      return merge(
        ...topics.map((topic) =>
          this.marketData.observe<unknown>(topic).pipe(map((payload) => ({ topic, payload })))
        )
      ).pipe(
        scan<{ topic: string; payload: unknown }, TradeStreamState>(
          (state, message) => {
            const incomingRows = mapTradeMessageToTimeSalesRows(message.payload, message.topic, this.symbolLookup);
            const lastUpdated = incomingRows[0]?.receivedAt ?? state.lastUpdated;

            return {
              rows: prependTradeRows(state.rows, incomingRows, MAX_TRADE_ROWS),
              loading: false,
              lastUpdated
            };
          },
          {
            rows: [],
            loading: true,
            lastUpdated: undefined
          }
        ),
        startWith<TradeStreamState>({
          rows: [],
          loading: true,
          lastUpdated: undefined
        }),
        catchError((error) =>
          of<TradeStreamState>({
            rows: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to load time and sales feed.',
            lastUpdated: undefined
          })
        )
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = combineLatest([this.filters$, this.settings$, this.tradeStreamState$, this.connectionState$]).pipe(
    map(([filters, settings, tradeState, connectionState]) => {
      const symbolOptions = getSymbolOptionsForMarket(filters.market);
      const filteredSymbolOptions = filterSymbolOptions(filters.market, filters.symbolQuery);
      const visibleRows = applyTimeSalesFilters(tradeState.rows, filters);

      return {
        filters,
        marketOptions: TIME_SALES_MARKET_OPTIONS,
        symbolOptions,
        filteredSymbolOptions,
        rows: visibleRows,
        loading: tradeState.loading,
        error: tradeState.error,
        connectionState,
        connectionLabel: mapConnectionLabel(connectionState),
        lastUpdated: tradeState.lastUpdated,
        rowCount: visibleRows.length,
        settings
      } satisfies TimeSalesViewModel;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectMarket(market: TimeSalesMarketFilter): void {
    const current = this.filtersSubject.value;
    const nextSymbol =
      current.symbol && isSymbolCompatibleWithMarket(current.symbol, market) ? current.symbol : null;

    this.filtersSubject.next({
      ...current,
      market,
      symbol: current.allSymbols ? null : nextSymbol,
      symbolQuery:
        current.allSymbols || nextSymbol
          ? symbolDisplayValue(nextSymbol, nextSymbol ? '' : current.symbolQuery)
          : ''
    });
  }

  setAllSymbols(allSymbols: boolean): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      allSymbols,
      symbol: allSymbols ? null : current.symbol,
      symbolQuery: allSymbols ? '' : current.symbolQuery
    });
  }

  updateSymbolQuery(query: string): void {
    const current = this.filtersSubject.value;
    const normalizedQuery = query.trimStart();
    const preservedSymbol =
      current.symbol &&
      symbolDisplayValue(current.symbol).toLowerCase() === normalizedQuery.trim().toLowerCase()
        ? current.symbol
        : null;

    this.filtersSubject.next({
      ...current,
      allSymbols: false,
      symbol: preservedSymbol,
      symbolQuery: normalizedQuery
    });
  }

  selectSymbol(symbol: SymbolOption | null): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      allSymbols: false,
      symbol,
      symbolQuery: symbolDisplayValue(symbol)
    });
  }

  updateMinQuantity(minQuantity: number): void {
    const current = this.filtersSubject.value;
    this.filtersSubject.next({
      ...current,
      minQuantity: Number.isFinite(minQuantity) && minQuantity > 0 ? minQuantity : 0
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

function isSymbolCompatibleWithMarket(symbol: SymbolOption, market: TimeSalesMarketFilter): boolean {
  if (market === 'all') {
    return true;
  }

  if (market === 'tadawul') {
    return symbol.marketShortName === 'TADAWUL';
  }

  return symbol.marketShortName.toLowerCase() === market;
}

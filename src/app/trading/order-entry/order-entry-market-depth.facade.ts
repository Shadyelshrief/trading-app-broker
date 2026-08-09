import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import {
  MarketDepthLevel,
  ParsedMarketDepthBook,
  mapMboMessageToDepthBook,
  mapMbpMessageToDepthBook
} from '../../shared/utils/market-depth.mapper';
import {
  MarketDepthOrderType,
  buildMboTopic,
  buildMbpTopic
} from '../../shared/utils/market-depth-topic.util';
import { SharedSymbolOption } from '../../shared/utils/symbol-reference.util';

export type OrderEntryDepthConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface OrderEntryDepthBookState {
  bids: readonly MarketDepthLevel[];
  offers: readonly MarketDepthLevel[];
  totalBidQuantity: number;
  totalBidOrders: number;
  totalOfferQuantity: number;
  totalOfferOrders: number;
  lastUpdated?: number;
  loading: boolean;
  error?: string;
}

export interface OrderEntryDepthViewModel {
  symbol: SharedSymbolOption | null;
  connectionState: OrderEntryDepthConnectionState;
  mboOrderType: MarketDepthOrderType;
  mbp: OrderEntryDepthBookState;
  mbo: OrderEntryDepthBookState;
}

const EMPTY_BOOK: OrderEntryDepthBookState = {
  bids: [],
  offers: [],
  totalBidQuantity: 0,
  totalBidOrders: 0,
  totalOfferQuantity: 0,
  totalOfferOrders: 0,
  loading: false
};

@Injectable()
export class OrderEntryMarketDepthFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly symbolSubject = new BehaviorSubject<SharedSymbolOption | null>(null);
  private readonly mboOrderTypeSubject = new BehaviorSubject<MarketDepthOrderType>('REGULAR');

  private readonly symbol$ = this.symbolSubject.pipe(
    distinctUntilChanged((left, right) => symbolKey(left) === symbolKey(right)),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly mbp$ = this.symbol$.pipe(
    switchMap((symbol) =>
      symbol
        ? this.observeBook(
            buildMbpTopic(symbol.market, symbol.symbolId),
            mapMbpMessageToDepthBook,
            'Unable to load Market by Price.'
          )
        : of({ ...EMPTY_BOOK })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly mbo$ = combineLatest([this.symbol$, this.mboOrderTypeSubject]).pipe(
    switchMap(([symbol, orderType]) =>
      symbol
        ? this.observeBook(
            buildMboTopic(symbol.market, symbol.symbolId, orderType),
            mapMboMessageToDepthBook,
            'Unable to load Market by Order.'
          )
        : of({ ...EMPTY_BOOK })
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly connectionState$ = this.marketData.getConnectionState().pipe(
    startWith(null as WebSocketState | null),
    map(mapConnectionState),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = combineLatest([
    this.symbol$,
    this.connectionState$,
    this.mboOrderTypeSubject,
    this.mbp$,
    this.mbo$
  ]).pipe(
    map(([symbol, connectionState, mboOrderType, mbp, mbo]) => ({
      symbol,
      connectionState,
      mboOrderType,
      mbp,
      mbo
    }) satisfies OrderEntryDepthViewModel),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectSymbol(symbol: SharedSymbolOption | null): void {
    this.symbolSubject.next(symbol ? normalizeSymbol(symbol) : null);
  }

  selectMboOrderType(orderType: MarketDepthOrderType): void {
    if (orderType !== this.mboOrderTypeSubject.value) {
      this.mboOrderTypeSubject.next(orderType);
    }
  }

  private observeBook(
    topic: string,
    mapper: (message: unknown) => ParsedMarketDepthBook,
    fallbackError: string
  ): Observable<OrderEntryDepthBookState> {
    return this.marketData.observe<unknown>(topic).pipe(
      map((message) => toBookState(mapper(message))),
      startWith({ ...EMPTY_BOOK, loading: true }),
      catchError((error: unknown) =>
        of({
          ...EMPTY_BOOK,
          error: error instanceof Error ? error.message : fallbackError
        })
      )
    );
  }
}

function toBookState(book: ParsedMarketDepthBook): OrderEntryDepthBookState {
  return {
    bids: book.bids,
    offers: book.offers,
    totalBidQuantity: book.totalBidQuantity,
    totalBidOrders: book.totalBidOrders,
    totalOfferQuantity: book.totalOfferQuantity,
    totalOfferOrders: book.totalOfferOrders,
    lastUpdated: book.lastUpdated,
    loading: false
  };
}

function mapConnectionState(state: WebSocketState | null): OrderEntryDepthConnectionState {
  if (!state) {
    return 'DISCONNECTED';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'CONNECTED';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'CONNECTING';
  }

  return state.status === 'reconnecting' ? 'RECONNECTING' : 'DISCONNECTED';
}

function normalizeSymbol(symbol: SharedSymbolOption): SharedSymbolOption {
  return {
    symbolId: symbol.symbolId.trim().toUpperCase(),
    symbolName: symbol.symbolName.trim(),
    market: symbol.market.trim().toUpperCase(),
    currency: symbol.currency.trim().toUpperCase()
  };
}

function symbolKey(symbol: SharedSymbolOption | null): string {
  return symbol ? `${symbol.market}:${symbol.symbolId}`.toUpperCase() : '';
}

import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  combineLatest,
  distinctUntilChanged,
  map,
  scan,
  shareReplay,
  startWith,
  switchMap,
  tap
} from 'rxjs';

import { buildTickTopic, MarketDataService } from '../../core/market-data';
import { ReferenceDataLookupsService } from '../../shared/lookups/reference-data-lookups.service';
import { mapAssetsToSharedSymbolOptions } from '../../shared/utils/symbol-reference.util';
import { applyFeederTickToFullMarketRow, parseFullMarketFeederTick } from '../full-market/full-market-feed.mapper';
import { buildReferenceFullMarketRows } from '../full-market/full-market-reference.data';
import { FullMarketRow } from '../models/full-market-row.model';
import { appendPriceQuotePoint, mapRowToPriceQuoteViewModel } from './price-quote.mapper';

interface PriceQuoteStateInput {
  title: string;
  route: string;
  section?: string;
  screen?: string;
  context?: Record<string, unknown>;
}

@Injectable()
export class PriceQuoteFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly reference = inject(ReferenceDataLookupsService);
  private readonly selectedRowSubject = new BehaviorSubject<FullMarketRow>(createFallbackRow('ADX', 'IHC'));
  private readonly symbolQuerySubject = new BehaviorSubject('');
  private availableSymbols: FullMarketRow[] = [];

  readonly vm$ = this.selectedRowSubject.pipe(
    distinctUntilChanged((left, right) => left.market === right.market && left.symbolId === right.symbolId),
    switchMap((selectedRow) => {
      const topic = buildTickTopic(selectedRow.market, selectedRow.symbolId);
      const availableSymbols$ = this.symbolQuerySubject.pipe(
        switchMap((query) => this.reference.searchAssets(query, selectedRow.market)),
        map((assets) =>
          mapAssetsToSharedSymbolOptions(assets).map((symbol) => ({
            ...createFallbackRow(symbol.market, symbol.symbolId),
            symbolName: symbol.symbolName,
            currency: symbol.currency
          }))
        ),
        tap((symbols) => (this.availableSymbols = symbols)),
        startWith([] as FullMarketRow[])
      );

      return combineLatest([
        this.marketData.observe<unknown>(topic).pipe(startWith(undefined)),
        this.marketData.getConnectionState().pipe(startWith(null)),
        availableSymbols$
      ]).pipe(
        scan(
          (state, [payload, connection, availableSymbols]) => {
            const tick = payload ? parseFullMarketFeederTick(payload, topic) : null;
            const nextRow = tick ? applyFeederTickToFullMarketRow(state.row, tick) : state.row;
            const nextChartData = appendPriceQuotePoint(state.chartData, nextRow);
            const isConnected =
              connection?.status === 'connected' || connection?.status === 'authenticated';

            return {
              row: nextRow,
              chartData: nextChartData,
              availableSymbols,
              loading: !isConnected && nextChartData.length === 0
            };
          },
          {
            row: selectedRow,
            chartData: appendPriceQuotePoint([], selectedRow),
            availableSymbols: [] as FullMarketRow[],
            loading: true
          }
        ),
        map((state) => mapRowToPriceQuoteViewModel(state.row, state.chartData, state.availableSymbols, state.loading))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  initialize(state: PriceQuoteStateInput | undefined): void {
    const quote = this.toRow(state?.context?.['quote']);

    if (!quote) {
      return;
    }

    const current = this.selectedRowSubject.value;

    if (current.market === quote.market && current.symbolId === quote.symbolId) {
      return;
    }

    this.selectedRowSubject.next(quote);
  }

  updateSymbolQuery(query: string): void {
    this.symbolQuerySubject.next(query);
  }

  selectSymbol(symbolId: string): void {
    const current = this.selectedRowSubject.value;
    const nextRow =
      this.availableSymbols.find((row) => row.symbolId === symbolId) ??
      current;

    if (nextRow.symbolId === current.symbolId && nextRow.market === current.market) {
      return;
    }

    this.selectedRowSubject.next({
      ...nextRow,
      status: nextRow.status || 'ACTIVE'
    });
    this.symbolQuerySubject.next('');
  }

  captureState(baseState: PriceQuoteStateInput | undefined): PriceQuoteStateInput {
    const row = this.selectedRowSubject.value;

    return {
      title: `Product Details - ${row.symbolId}`,
      route: `/app/pricing/price-quote/${row.market.toLowerCase()}/${row.symbolId.toLowerCase()}`,
      section: baseState?.section ?? 'pricing',
      screen: baseState?.screen ?? 'price-quote',
      context: {
        quote: row
      }
    };
  }

  private toRow(value: unknown): FullMarketRow | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    const candidate = value as Partial<FullMarketRow>;

    if (typeof candidate.symbolId !== 'string' || typeof candidate.market !== 'string') {
      return null;
    }

    return {
      ...createFallbackRow(candidate.market, candidate.symbolId),
      ...candidate,
      symbolName: typeof candidate.symbolName === 'string' ? candidate.symbolName : candidate.symbolId,
      market: candidate.market.toUpperCase(),
      status: typeof candidate.status === 'string' ? candidate.status : 'ACTIVE',
      direction: candidate.direction ?? 'UNCHANGED'
    };
  }
}

function createFallbackRow(market: string, symbolId: string): FullMarketRow {
  const reference =
    buildReferenceFullMarketRows(market).find((row) => row.symbolId === symbolId.toUpperCase()) ??
    buildReferenceFullMarketRows(market)[0];

  if (reference) {
    return reference;
  }

  return {
    symbolId: symbolId.toUpperCase(),
    symbolName: symbolId.toUpperCase(),
    market: market.toUpperCase(),
    sector: '',
    status: 'ACTIVE',
    bidPrice: 0,
    bidQty: 0,
    offerPrice: 0,
    offerQty: 0,
    lastPrice: 0,
    lastTradeQty: 0,
    lastTradeTime: '--',
    openPrice: 0,
    previousClose: 0,
    highPrice: 0,
    lowPrice: 0,
    averagePrice: 0,
    change: 0,
    changePercent: 0,
    totalVolume: 0,
    turnover: 0,
    totalBidQty: 0,
    totalOfferQty: 0,
    numberOfTrades: 0,
    week52High: 0,
    week52Low: 0,
    peRatio: 0,
    pbRatio: 0,
    marketCap: 0,
    yield: 0,
    toleranceHigh: 0,
    toleranceLow: 0,
    currency: 'AED',
    direction: 'UNCHANGED',
    updatedAt: 0,
    tradePrice: 0,
    tradeQuantity: 0,
    ratio: 0
  };
}

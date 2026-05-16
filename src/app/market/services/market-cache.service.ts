import { Injectable } from '@angular/core';

import { FullMarketRow } from '../models/full-market-row.model';

@Injectable({ providedIn: 'root' })
export class MarketCacheService {
  private readonly fullMarketStore = new Map<string, FullMarketRow>();

  replaceFullMarket(rows: FullMarketRow[]): FullMarketRow[] {
    const previousStore = new Map(this.fullMarketStore);
    this.fullMarketStore.clear();
    rows.forEach((row) => {
      const key = this.createKey(row.market, row.symbolId);
      const previous = previousStore.get(key);
      this.fullMarketStore.set(key, previous ? this.mergeSummaryRow(previous, row) : row);
    });

    return Array.from(this.fullMarketStore.values());
  }

  upsertFullMarket(rows: FullMarketRow[]): FullMarketRow[] {
    rows.forEach((row) => {
      const key = this.createKey(row.market, row.symbolId);
      const previous = this.fullMarketStore.get(key);

      this.fullMarketStore.set(key, previous ? { ...previous, ...row } : row);
    });

    return Array.from(this.fullMarketStore.values());
  }

  updateFullMarketRow(exchange: string, symbolId: string, updater: (current: FullMarketRow) => FullMarketRow): FullMarketRow[] {
    const key = this.createKey(exchange, symbolId);
    const current = this.fullMarketStore.get(key);

    if (!current) {
      return this.snapshot();
    }

    this.fullMarketStore.set(key, updater(current));
    return this.snapshot();
  }

  snapshot(): FullMarketRow[] {
    return Array.from(this.fullMarketStore.values());
  }

  private createKey(exchange: string, symbolId: string): string {
    return `${exchange.trim().toLowerCase()}:${symbolId.trim().toLowerCase()}`;
  }

  private mergeSummaryRow(previous: FullMarketRow, incoming: FullMarketRow): FullMarketRow {
    return {
      ...incoming,
      bidPrice: previous.bidPrice,
      bidQty: previous.bidQty,
      offerPrice: previous.offerPrice,
      offerQty: previous.offerQty,
      lastPrice: previous.lastPrice,
      lastTradeQty: previous.lastTradeQty,
      lastTradeTime: previous.lastTradeTime,
      openPrice: previous.openPrice,
      previousClose: previous.previousClose,
      highPrice: previous.highPrice,
      lowPrice: previous.lowPrice,
      averagePrice: previous.averagePrice,
      change: previous.change,
      changePercent: previous.changePercent,
      totalVolume: previous.totalVolume,
      turnover: previous.turnover,
      totalBidQty: previous.totalBidQty,
      totalOfferQty: previous.totalOfferQty,
      numberOfTrades: previous.numberOfTrades,
      status: previous.status,
      direction: previous.direction,
      updatedAt: Math.max(previous.updatedAt, incoming.updatedAt),
      tradePrice: previous.tradePrice,
      tradeQuantity: previous.tradeQuantity,
      ratio: previous.ratio
    };
  }
}

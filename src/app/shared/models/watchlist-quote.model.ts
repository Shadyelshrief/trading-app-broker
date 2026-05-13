export type PriceDirection = 'up' | 'down' | 'flat';

export interface WatchlistQuote {
  symbol: string;
  lastPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  previousClose: number;
  direction: PriceDirection;
}

export interface WatchlistMarketEvent {
  type: 'snapshot' | 'update';
  rows: WatchlistQuote[];
}

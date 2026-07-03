export interface FullMarketRow {
  symbolId: string;
  symbolName: string;
  market: string;
  sector: string;
  status: string;
  bidPrice: number;
  bidQty: number;
  offerPrice: number;
  offerQty: number;
  lastPrice: number;
  lastTradeQty: number;
  lastTradeTime: string;
  openPrice: number;
  previousClose: number;
  highPrice: number;
  lowPrice: number;
  averagePrice: number;
  change: number;
  changePercent: number;
  totalVolume: number;
  turnover: number;
  totalBidQty: number;
  totalOfferQty: number;
  numberOfTrades: number;
  week52High: number;
  week52Low: number;
  peRatio: number;
  pbRatio: number;
  marketCap: number;
  yield: number;
  toleranceHigh: number;
  toleranceLow: number;
  currency: string;
  direction: 'UP' | 'DOWN' | 'UNCHANGED';
  updatedAt: number;
  tradePrice: number;
  tradeQuantity: number;
  ratio: number;
}

export interface FullMarketFilters {
  exchange: string;
  sector: string;
  search: string;
  direction: 'ALL' | 'UP' | 'DOWN' | 'UNCHANGED';
}

export interface FullMarketViewModel {
  rows: FullMarketRow[];
  sectors: string[];
  exchanges: string[];
  selectedExchange: string;
  selectedSector: string;
  totalSymbols: number;
  loading: boolean;
  connectionLabel: string;
  connectionTone: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  lastUpdatedAt: number | null;
}

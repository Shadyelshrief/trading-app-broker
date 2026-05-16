import { FullMarketRow } from '../models/full-market-row.model';

export interface PriceQuoteChartPoint {
  time: string;
  price: number;
  direction: 'UP' | 'DOWN' | 'UNCHANGED';
}

export interface PriceQuoteViewModel {
  symbolId: string;
  symbolName: string;
  market: string;
  currency: string;
  bidPrice: number;
  bidQty: number;
  offerPrice: number;
  offerQty: number;
  lastPrice: number;
  lastTradeTime: string;
  change: number;
  changePercent: number;
  direction: 'UP' | 'DOWN' | 'UNCHANGED';
  tradePrice: number;
  tradeQty: number;
  toleranceHigh: number;
  toleranceLow: number;
  totalBidQty: number;
  totalOfferQty: number;
  ratioOfferBid: number;
  marketCap: number;
  yield: number;
  per: number;
  pbr: number;
  previousClose: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  numberOfTrades: number;
  averagePrice: number;
  totalVolume: number;
  turnover: number;
  week52High: number;
  week52Low: number;
  chartData: PriceQuoteChartPoint[];
  rangePositionPercent: number;
  suspended: boolean;
  status: string;
  loading: boolean;
  lastUpdated: number;
  availableSymbols: readonly FullMarketRow[];
}

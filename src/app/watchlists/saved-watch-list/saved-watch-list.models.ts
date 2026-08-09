import { MarketGridSettings } from '../../shared/models/market-grid.model';

export type WatchListSourceType = 'ALL_SYMBOLS' | 'FILTER' | 'SELECTED_SYMBOLS';
export type WatchListJoin = 'AND' | 'OR';
export type WatchListOperator = '>' | '>=' | '<' | '<=' | '=' | '!=';
export type WatchListDirection = 'UP' | 'DOWN' | 'UNCHANGED';

export interface ClientOption {
  clientId: string;
  clientName: string;
  friendlyId?: string;
}

export interface PortfolioOption {
  portfolioId: string;
  portfolioName: string;
}

export interface SymbolOption {
  assetId?: string;
  symbolId: string;
  symbolName: string;
  market: string;
  marketShortName: string;
  sector?: string;
  currency: string;
}

export interface WatchListSourceFilters {
  market?: string;
  sector?: string;
  index?: string;
  tradingSession?: string;
  client?: ClientOption | null;
  portfolio?: PortfolioOption | null;
}

export interface WatchListCondition {
  join?: WatchListJoin;
  field: string;
  operator: WatchListOperator;
  value: string | number;
}

export interface WatchListConfig {
  id: string;
  name: string;
  sourceType: WatchListSourceType;
  filters?: WatchListSourceFilters;
  selectedSymbols?: SymbolOption[];
  conditions?: WatchListCondition[];
  createdAt: number;
  updatedAt: number;
}

export interface WatchListRow {
  marketName: string;
  marketShortName: string;
  symbolName: string;
  symbolShortName: string;
  symbolId: string;
  remarks?: string;
  status?: string;
  bidPrice: number;
  bidSize: number;
  offerPrice: number;
  offerSize: number;
  openPrice: number;
  lastPrice: number;
  lastTradeQty: number;
  lastTradeTime: string;
  changePercent: number;
  changeDirection: WatchListDirection;
  previousClosed: number;
  highPrice: number;
  lowPrice: number;
  averagePrice: number;
  numberOfTrades: number;
  totalVolume: number;
  turnover: number;
  week52High: number;
  week52Low: number;
  peRatio: number;
  marketCapitalization: number;
  pbRatio: number;
  yield: number;
  change: number;
  tradePrice: number;
  tradeQty: number;
  toleranceHigh: number;
  toleranceLow: number;
  totalBidQty: number;
  totalOfferQty: number;
  ratioOfferBid: number;
  currency: string;
  updatedAt: number;
}

export interface SavedWatchListViewModel {
  config: WatchListConfig | null;
  rows: WatchListRow[];
  loading: boolean;
  error?: string;
  connectionTone: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  lastUpdatedAt: number | null;
  settings: MarketGridSettings;
}

export type MarketMapMarketFilter = 'adx' | 'dfm' | 'tadawul';
export type MarketMapSortOrder = 'ASC' | 'DESC';
export type MarketMapSortCriteria = 'CHANGE_PERCENT' | 'LAST_PRICE' | 'NUMBER_OF_TRADES';
export type MarketMapDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type MarketMapConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface MarketOption {
  label: string;
  value: MarketMapMarketFilter;
}

export interface SortOrderOption {
  label: string;
  value: MarketMapSortOrder;
}

export interface SortCriteriaOption {
  label: string;
  value: MarketMapSortCriteria;
}

export interface MarketMapFilters {
  market: MarketMapMarketFilter;
  sortOrder: MarketMapSortOrder;
  sortCriteria: MarketMapSortCriteria;
}

export interface MarketMapSettings {
  startColor: string;
  endColor: string;
  invalidSymbolColor: string;
  fontFamily: string;
  fontSize: number;
}

export interface MarketMapSymbol {
  symbolId: string;
  symbolName: string;
  market: string;
  marketShortName: string;
  lastPrice: number;
  changePercent: number;
  change: number;
  numberOfTrades: number;
  valid: boolean;
  direction: MarketMapDirection;
  color: string;
  displayValue: number | string;
  updatedAt: number;
}

export interface MarketMapViewModel {
  filters: MarketMapFilters;
  marketOptions: readonly MarketOption[];
  sortOrderOptions: readonly SortOrderOption[];
  sortCriteriaOptions: readonly SortCriteriaOption[];
  symbols: MarketMapSymbol[];
  settings: MarketMapSettings;
  loading: boolean;
  error?: string;
  connectionState: MarketMapConnectionState;
  connectionLabel: string;
  lastUpdated?: number;
}

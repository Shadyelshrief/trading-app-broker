import { MarketGridSettings } from '../../shared/models/market-grid.model';

export type TopSymbolsDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type TopSymbolsConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
export type TopSymbolsMarketFilter = 'all' | 'tadawul' | 'dfm' | 'adx';
export type TopSymbolsViewKey =
  | 'MOST_ACTIVE_VOLUME'
  | 'MOST_ACTIVE_VALUE'
  | 'TOP_GAINERS_PERCENT'
  | 'TOP_GAINERS_CHANGE'
  | 'TOP_LOSERS_PERCENT'
  | 'TOP_LOSERS_CHANGE';

export interface MarketOption {
  label: string;
  value: TopSymbolsMarketFilter;
}

export interface TopSymbolsViewOption {
  label: string;
  value: TopSymbolsViewKey;
}

export interface TopSymbolRow {
  marketName: string;
  marketShortName: string;
  symbolName: string;
  symbolShortName: string;
  symbolId: string;
  changePercent: number;
  changeDirection: TopSymbolsDirection;
  totalVolume: number;
  turnover: number;
  change: number;
  currency: string;
  lastPrice: number;
  updatedAt: number;
}

export interface TopSymbolsFilters {
  market: TopSymbolsMarketFilter;
  selectedView: TopSymbolsViewKey;
  numberOfSymbols: number;
}

export interface TopSymbolsViewModel {
  filters: TopSymbolsFilters;
  marketOptions: readonly MarketOption[];
  viewOptions: readonly TopSymbolsViewOption[];
  rows: readonly TopSymbolRow[];
  loading: boolean;
  error?: string;
  connectionState: TopSymbolsConnectionState;
  connectionLabel: string;
  lastUpdated?: number;
  settings: MarketGridSettings;
}

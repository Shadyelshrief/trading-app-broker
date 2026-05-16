import { MarketGridSettings } from '../../shared/models/market-grid.model';

export type HistoricalTopSymbolsDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type HistoricalTopSymbolsMarketFilter = 'all' | 'tadawul' | 'dfm' | 'adx';
export type HistoricalTopSymbolsViewKey =
  | 'MOST_ACTIVE_VOLUME'
  | 'MOST_ACTIVE_VALUE'
  | 'TOP_GAINERS_PERCENT'
  | 'TOP_GAINERS_CHANGE'
  | 'TOP_LOSERS_PERCENT'
  | 'TOP_LOSERS_CHANGE';

export interface HistoricalMarketOption {
  label: string;
  value: HistoricalTopSymbolsMarketFilter;
}

export interface HistoricalTopSymbolsViewOption {
  label: string;
  value: HistoricalTopSymbolsViewKey;
}

export interface HistoricalTopSymbolRow {
  marketName: string;
  marketShortName: string;
  symbolName: string;
  symbolShortName: string;
  symbolId: string;
  lastPrice: number;
  changePercent: number;
  changeDirection: HistoricalTopSymbolsDirection;
  totalVolume: number;
  turnover: number;
  change: number;
  currency: string;
}

export interface HistoricalTopSymbolsFilters {
  market: HistoricalTopSymbolsMarketFilter;
  selectedView: HistoricalTopSymbolsViewKey;
  numberOfSymbols: number;
  fromDate: string;
  toDate: string;
}

export interface HistoricalTopSymbolsViewModel {
  filters: HistoricalTopSymbolsFilters;
  marketOptions: readonly HistoricalMarketOption[];
  viewOptions: readonly HistoricalTopSymbolsViewOption[];
  rows: readonly HistoricalTopSymbolRow[];
  loading: boolean;
  error?: string;
  validationError?: string;
  lastLoadedAt?: number;
  settings: MarketGridSettings;
}

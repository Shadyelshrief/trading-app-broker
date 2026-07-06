import { MarketGridSettings } from '../../shared/models/market-grid.model';

export type TimeSalesDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type TimeSalesConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
export type TimeSalesMarketFilter = 'all' | 'tadawul' | 'dfm' | 'adx';

export interface MarketOption {
  label: string;
  value: TimeSalesMarketFilter;
}

export interface SymbolOption {
  symbolId: string;
  symbolName: string;
  marketShortName: string;
  marketName: string;
  currency: string;
}

export interface TimeSalesRow {
  id: string;
  symbolId: string;
  symbolName: string;
  marketShortName: string;
  marketName: string;
  executionTime: string;
  tradePrice: number;
  executedQuantity: number;
  splits: number;
  currency: string;
  changeDirection: TimeSalesDirection;
  receivedAt: number;
}

export interface TimeSalesFilters {
  allSymbols: boolean;
  symbol: SymbolOption | null;
  symbolQuery: string;
  market: TimeSalesMarketFilter;
  minQuantity: number;
}

export interface TimeSalesViewModel {
  filters: TimeSalesFilters;
  marketOptions: readonly MarketOption[];
  symbolOptions: readonly SymbolOption[];
  filteredSymbolOptions: readonly SymbolOption[];
  rows: readonly TimeSalesRow[];
  loading: boolean;
  error?: string;
  connectionState: TimeSalesConnectionState;
  lastUpdated?: number;
  rowCount: number;
  settings: MarketGridSettings;
}

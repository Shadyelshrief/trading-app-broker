export type HeaderMarketStatusTone = 'positive' | 'negative' | 'neutral';
export type HeaderConnectionTone = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
export type HeaderMarketSessionStatus = 'Opened' | 'Closed' | 'Pre Open' | 'Pre Close' | 'Unknown';

export interface HeaderMarketIndexOption {
  id: string;
  label: string;
}

export interface HeaderMarketOption {
  id: string;
  label: string;
  timeZone: string;
  indexes: readonly HeaderMarketIndexOption[];
}

export interface HeaderMarketStatusSnapshot {
  marketStatus: HeaderMarketSessionStatus;
  statusTone: HeaderMarketStatusTone;
  indexValue: number | null;
  change: number | null;
  changePercent: number | null;
  changeTone: HeaderMarketStatusTone;
  numberOfTrades: number | null;
  totalVolume: number | null;
  turnover: number | null;
  updatedAt: number | null;
}

export interface HeaderMarketStatusViewModel extends HeaderMarketStatusSnapshot {
  markets: readonly HeaderMarketOption[];
  indexes: readonly HeaderMarketIndexOption[];
  selectedMarket: string;
  selectedIndex: string;
  marketTime: string;
  marketDate: string;
  connectionLabel: string;
  connectionTone: HeaderConnectionTone;
}

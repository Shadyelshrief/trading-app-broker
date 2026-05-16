export type MarketIndicesDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type MarketIndicesConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface MarketIndexRow {
  index: string;
  name: string;
  shortName: string;
  marketName: string;
  marketShortName: string;
  indexCurrentValue: number;
  initialOpenValue: number;
  highPrice: number;
  lowPrice: number;
  totalVolume: number;
  totalValue: number;
  previousClosed: number;
  netChange: number;
  changePercent: number;
  changeDirection: MarketIndicesDirection;
  updatedAt: number;
}

export interface MarketIndicesViewModel {
  selectedMarket: string;
  marketOptions: MarketOption[];
  rows: MarketIndexRow[];
  loading: boolean;
  error?: string;
  connectionState: MarketIndicesConnectionState;
  lastUpdated?: number;
  connectionLabel: string;
}

export interface MarketOption {
  label: string;
  value: string;
}

export interface MarketIndexReference {
  marketFilter: string;
  exchange: string;
  indexId: string;
  index: string;
  name: string;
  shortName: string;
  marketName: string;
  marketShortName: string;
}

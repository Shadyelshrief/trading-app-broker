export type MarketSummaryStatus = 'OPENED' | 'CLOSED' | 'PRE_OPEN' | 'PRE_CLOSE';
export type MarketSummaryDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type MarketSummaryConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
export type MarketParticipantType = 'National' | 'Arab' | 'Foreigners' | 'Institution' | 'Retail';

export interface MarketIndexPoint {
  time: string;
  value: number;
}

export interface MarketParticipantStatistic {
  type: MarketParticipantType;
  buy: number;
  sell: number;
  net: number;
}

export interface MarketSummaryViewModel {
  selectedMarket: string;
  indexName: string;
  marketStatus: MarketSummaryStatus;
  indexCurrentValue: number;
  change: number;
  changePercent: number;
  changeDirection: MarketSummaryDirection;
  totalTrades: number;
  totalVolume: number;
  turnover: number;
  chartData: MarketIndexPoint[];
  symbolsSummary: {
    traded: number;
    up: number;
    down: number;
    unchanged: number;
  };
  statistics: MarketParticipantStatistic[];
  connectionState: MarketSummaryConnectionState;
  lastUpdated: number;
  loading: boolean;
  error?: string;
  markets: readonly MarketSummaryMarketOption[];
  statusLabel: string;
  connectionLabel: string;
  hasLiveSummary: boolean;
  hasStatistics: boolean;
}

export interface MarketSummaryMarketOption {
  id: string;
  label: string;
  timeZone: string;
  primaryIndex: {
    id: string;
    label: string;
  };
}

export interface MarketSummarySnapshot {
  indexName: string;
  marketStatus: MarketSummaryStatus | null;
  indexCurrentValue: number | null;
  change: number | null;
  changePercent: number | null;
  changeDirection: MarketSummaryDirection;
  totalTrades: number | null;
  totalVolume: number | null;
  turnover: number | null;
  symbolsSummary: {
    traded: number | null;
    up: number | null;
    down: number | null;
    unchanged: number | null;
  };
  statistics: MarketParticipantStatistic[];
  lastUpdated: number | null;
}

export const MARKET_SUMMARY_MARKETS: readonly MarketSummaryMarketOption[] = [
  {
    id: 'adx',
    label: 'ADX',
    timeZone: 'Asia/Dubai',
    primaryIndex: {
      id: 'fadx15',
      label: 'FADX 15'
    }
  },
  {
    id: 'dfm',
    label: 'DFM',
    timeZone: 'Asia/Dubai',
    primaryIndex: {
      id: 'dfmgi',
      label: 'DFM General'
    }
  }
] as const;

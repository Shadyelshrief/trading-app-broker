import { TickerConnectionState, TickerDirection, TickerSettings } from '../ticker-settings.models';

export interface TradingTickerItem {
  id: string;
  symbolId: string;
  symbolName: string;
  tradedQuantity: number;
  tradePrice: number;
  change: number;
  changePercent: number;
  changeDirection: TickerDirection;
  market: string;
  currency: string;
  executionTime: string;
  receivedAt: number;
}

export interface TradingTickerViewModel {
  items: readonly TradingTickerItem[];
  settings: TickerSettings;
  sectorOptions: readonly string[];
  loading: boolean;
  error?: string;
  connectionState: TickerConnectionState;
  lastUpdated?: number;
}

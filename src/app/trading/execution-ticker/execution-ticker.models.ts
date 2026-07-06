import { MarketGridSettings } from '../../shared/models/market-grid.model';

export type ExecutionOrderSide = 'BUY' | 'SELL';
export type ExecutionConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';

export interface ExecutionTickerRow {
  id: string;
  marketName: string;
  orderNumber: string;
  symbolId: string;
  symbolName: string;
  currency: string;
  portfolioNumber: string;
  clientId: string;
  clientName: string;
  orderSide: ExecutionOrderSide;
  transactionType: string;
  price: number | string;
  quantity: number;
  remainingQuantity: number;
  receivedAt: number;
  raw?: unknown;
}

export interface ExecutionTickerViewModel {
  rows: readonly ExecutionTickerRow[];
  loading: boolean;
  error?: string;
  connectionState: ExecutionConnectionState;
  lastUpdated?: number;
  settings: MarketGridSettings;
}

export interface ExecutionTickerFeedConfig {
  topics: readonly string[];
  clientIds: readonly string[];
}

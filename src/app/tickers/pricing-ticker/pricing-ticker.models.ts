import { TickerConnectionState, TickerDirection, TickerSettings } from '../ticker-settings.models';

export interface PricingTickerItem {
  symbolId: string;
  symbolName: string;
  tradePrice: number;
  totalVolume: number;
  change: number;
  changePercent: number;
  changeDirection: TickerDirection;
  market: string;
  currency: string;
  updatedAt: number;
}

export interface PricingTickerViewModel {
  items: readonly PricingTickerItem[];
  settings: TickerSettings;
  sectorOptions: readonly string[];
  loading: boolean;
  error?: string;
  connectionState: TickerConnectionState;
  connectionLabel: string;
  lastUpdated?: number;
}

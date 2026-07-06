import { WebSocketState } from '../core/market-data';
import { SymbolOption, WatchListConfig } from '../watchlists/saved-watch-list/saved-watch-list.models';

export type TickerMarketFilter = 'all' | 'tadawul' | 'dfm' | 'adx';
export type TickerConnectionState = 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
export type TickerDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type TickerMode = 'MARKET_FEED' | 'LATEST_PRICE' | 'ACCUMULATED_VOLUME_BY_PRICE';

export interface TickerSettings {
  market?: TickerMarketFilter;
  sector?: string;
  watchListId?: string;
  portfolioId?: string;
  tradingSession?: string;
  symbols?: SymbolOption[];
  speed: number;
  mode?: TickerMode;
}

export interface TickerMarketOption {
  label: string;
  value: TickerMarketFilter;
}

export interface TickerSettingsViewModel {
  marketOptions: readonly TickerMarketOption[];
  sectorOptions: readonly string[];
  watchLists: readonly WatchListConfig[];
  settings: TickerSettings;
}

export const TICKER_MARKET_OPTIONS: readonly TickerMarketOption[] = [
  { label: 'All Markets', value: 'all' },
  { label: 'Saudi Arabian Stock Market', value: 'tadawul' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'AbuDhabi Stock Market', value: 'adx' }
] as const;

export const DEFAULT_TICKER_SETTINGS: TickerSettings = {
  market: 'adx',
  sector: 'all',
  speed: 34,
  mode: 'MARKET_FEED'
};

export function mapTickerConnectionState(state: WebSocketState | null): TickerConnectionState {
  if (!state) {
    return 'DISCONNECTED';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'CONNECTED';
  }

  if (state.status === 'reconnecting') {
    return 'RECONNECTING';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'CONNECTING';
  }

  return 'DISCONNECTED';
}

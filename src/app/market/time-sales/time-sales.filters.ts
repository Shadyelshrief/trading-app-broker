import { MarketOption, TimeSalesMarketFilter } from './time-sales.models';

export const TIME_SALES_MARKET_OPTIONS: readonly MarketOption[] = [
  { label: 'All Markets', value: 'all' },
  { label: 'Saudi Arabian Stock Market', value: 'tadawul' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'AbuDhabi Stock Market', value: 'adx' }
] as const;

export function getSupportedTradeExchanges(market: TimeSalesMarketFilter): readonly string[] {
  switch (market) {
    case 'adx':
      return ['adx'];
    case 'dfm':
      return ['dfm'];
    case 'tadawul':
      return ['tadawul'];
    default:
      return ['adx', 'dfm', 'tadawul'];
  }
}

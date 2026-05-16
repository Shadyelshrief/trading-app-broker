import {
  MarketOption,
  TopSymbolsMarketFilter,
  TopSymbolsViewKey,
  TopSymbolsViewOption
} from './top-symbols.models';

export const TOP_SYMBOLS_MARKET_OPTIONS: readonly MarketOption[] = [
  { label: 'All Markets', value: 'all' },
  { label: 'Saudi Arabian Stock Market', value: 'tadawul' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'AbuDhabi Stock Market', value: 'adx' }
] as const;

export const TOP_SYMBOLS_VIEW_OPTIONS: readonly TopSymbolsViewOption[] = [
  { label: 'Most Active by Volume', value: 'MOST_ACTIVE_VOLUME' },
  { label: 'Most Active by Value', value: 'MOST_ACTIVE_VALUE' },
  { label: 'Top Gainers by Percent Change', value: 'TOP_GAINERS_PERCENT' },
  { label: 'Top Gainers by Change', value: 'TOP_GAINERS_CHANGE' },
  { label: 'Top Losers by Percent Change', value: 'TOP_LOSERS_PERCENT' },
  { label: 'Top Losers by Change', value: 'TOP_LOSERS_CHANGE' }
] as const;

export function getSupportedTopSymbolExchanges(market: TopSymbolsMarketFilter): readonly string[] {
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

export function getHighlightedColumn(view: TopSymbolsViewKey): string {
  switch (view) {
    case 'MOST_ACTIVE_VOLUME':
      return 'totalVolume';
    case 'MOST_ACTIVE_VALUE':
      return 'turnover';
    case 'TOP_GAINERS_PERCENT':
    case 'TOP_LOSERS_PERCENT':
      return 'changePercent';
    case 'TOP_GAINERS_CHANGE':
    case 'TOP_LOSERS_CHANGE':
      return 'change';
    default:
      return '';
  }
}

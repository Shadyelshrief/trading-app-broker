import type { SharedSymbolOption } from '../../shared/utils/symbol-reference.util';
import {
  MarketOption,
  NewsAnnouncementsMarketFilter,
  SymbolOption
} from './news-announcements.models';

const MARKET_NAME_LOOKUP: Record<string, string> = {
  ADX: 'AbuDhabi Stock Market',
  DFM: 'Dubai Stock Market',
  TADAWUL: 'Saudi Arabian Stock Market'
};

export const NEWS_ANNOUNCEMENTS_MARKET_OPTIONS: readonly MarketOption[] = [
  { label: 'All Markets', value: 'all' },
  { label: 'Saudi Arabian Stock Market', value: 'tadawul' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'AbuDhabi Stock Market', value: 'adx' }
] as const;

export function getNewsSymbolOptions(symbols: readonly SharedSymbolOption[]): SymbolOption[] {
  return symbols.map((symbol) => ({
    symbolId: symbol.symbolId,
    symbolName: symbol.symbolName,
    marketShortName: symbol.market,
    marketName: MARKET_NAME_LOOKUP[symbol.market] ?? `${symbol.market} Market`
  }));
}

export function displayNewsSymbol(value: string | SymbolOption | null | undefined): string {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  return `${value.symbolId} - ${value.symbolName}`;
}

export function normalizeNewsMarket(value: string | null | undefined): NewsAnnouncementsMarketFilter {
  switch (value) {
    case 'adx':
    case 'dfm':
    case 'tadawul':
    case 'all':
      return value;
    default:
      return 'all';
  }
}

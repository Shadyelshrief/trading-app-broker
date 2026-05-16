import {
  MarketMapMarketFilter,
  MarketOption,
  MarketMapSortCriteria,
  MarketMapSortOrder,
  SortCriteriaOption,
  SortOrderOption
} from './market-map.models';

export const MARKET_MAP_MARKET_OPTIONS: readonly MarketOption[] = [
  { label: 'AbuDhabi Stock Market', value: 'adx' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'Saudi Arabian Stock Market', value: 'tadawul' }
] as const;

export const MARKET_MAP_SORT_ORDER_OPTIONS: readonly SortOrderOption[] = [
  { label: 'Ascending', value: 'ASC' },
  { label: 'Descending', value: 'DESC' }
] as const;

export const MARKET_MAP_SORT_CRITERIA_OPTIONS: readonly SortCriteriaOption[] = [
  { label: 'Change %', value: 'CHANGE_PERCENT' },
  { label: 'Last Price', value: 'LAST_PRICE' },
  { label: 'No. of Trades', value: 'NUMBER_OF_TRADES' }
] as const;

export function getMarketMapCriteriaLabel(criteria: MarketMapSortCriteria): string {
  return (
    MARKET_MAP_SORT_CRITERIA_OPTIONS.find((option) => option.value === criteria)?.label ?? 'Selected Value'
  );
}

export function getMarketMapMarketLabel(market: MarketMapMarketFilter): string {
  return MARKET_MAP_MARKET_OPTIONS.find((option) => option.value === market)?.label ?? market.toUpperCase();
}

export function normalizeMarketMapOrder(sortOrder: string | null | undefined): MarketMapSortOrder {
  return sortOrder === 'ASC' ? 'ASC' : 'DESC';
}

export function normalizeMarketMapCriteria(
  sortCriteria: string | null | undefined
): MarketMapSortCriteria {
  switch (sortCriteria) {
    case 'CHANGE_PERCENT':
    case 'LAST_PRICE':
    case 'NUMBER_OF_TRADES':
      return sortCriteria;
    default:
      return 'CHANGE_PERCENT';
  }
}

export function normalizeMarketMapMarket(market: string | null | undefined): MarketMapMarketFilter {
  switch (market) {
    case 'adx':
    case 'dfm':
    case 'tadawul':
      return market;
    default:
      return 'adx';
  }
}

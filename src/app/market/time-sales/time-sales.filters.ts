import { buildReferenceFullMarketRows } from '../full-market/full-market-reference.data';
import { MarketOption, SymbolOption, TimeSalesMarketFilter } from './time-sales.models';

export const TIME_SALES_MARKET_OPTIONS: readonly MarketOption[] = [
  { label: 'All Markets', value: 'all' },
  { label: 'Saudi Arabian Stock Market', value: 'tadawul' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'AbuDhabi Stock Market', value: 'adx' }
] as const;

const SAUDI_REFERENCE_SYMBOLS: readonly SymbolOption[] = [
  {
    symbolId: 'ARAMCO',
    symbolName: 'Saudi Aramco',
    marketShortName: 'TADAWUL',
    marketName: 'Saudi Arabian Stock Market',
    currency: 'SAR'
  },
  {
    symbolId: 'SABIC',
    symbolName: 'Saudi Basic Industries',
    marketShortName: 'TADAWUL',
    marketName: 'Saudi Arabian Stock Market',
    currency: 'SAR'
  },
  {
    symbolId: 'ALRAJHI',
    symbolName: 'Al Rajhi Bank',
    marketShortName: 'TADAWUL',
    marketName: 'Saudi Arabian Stock Market',
    currency: 'SAR'
  },
  {
    symbolId: 'SNB',
    symbolName: 'Saudi National Bank',
    marketShortName: 'TADAWUL',
    marketName: 'Saudi Arabian Stock Market',
    currency: 'SAR'
  },
  {
    symbolId: 'STC',
    symbolName: 'Saudi Telecom Company',
    marketShortName: 'TADAWUL',
    marketName: 'Saudi Arabian Stock Market',
    currency: 'SAR'
  }
] as const;

const ADX_SYMBOLS = buildReferenceFullMarketRows('ADX').map(
  (row): SymbolOption => ({
    symbolId: row.symbolId,
    symbolName: row.symbolName,
    marketShortName: 'ADX',
    marketName: 'AbuDhabi Stock Market',
    currency: row.currency
  })
);

const DFM_SYMBOLS = buildReferenceFullMarketRows('DFM').map(
  (row): SymbolOption => ({
    symbolId: row.symbolId,
    symbolName: row.symbolName,
    marketShortName: 'DFM',
    marketName: 'Dubai Stock Market',
    currency: row.currency
  })
);

export const TIME_SALES_SYMBOL_OPTIONS: readonly SymbolOption[] = [
  ...ADX_SYMBOLS,
  ...DFM_SYMBOLS,
  ...SAUDI_REFERENCE_SYMBOLS
];

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

export function getSymbolOptionsForMarket(market: TimeSalesMarketFilter): SymbolOption[] {
  if (market === 'all') {
    return [...TIME_SALES_SYMBOL_OPTIONS];
  }

  const expectedShortName = market === 'tadawul' ? 'TADAWUL' : market.toUpperCase();

  return TIME_SALES_SYMBOL_OPTIONS.filter((option) => option.marketShortName === expectedShortName);
}

export function filterSymbolOptions(
  market: TimeSalesMarketFilter,
  query: string
): SymbolOption[] {
  const trimmedQuery = query.trim().toLowerCase();
  const options = getSymbolOptionsForMarket(market);

  if (!trimmedQuery) {
    return options.slice(0, 12);
  }

  return options
    .filter((option) =>
      `${option.symbolId} ${option.symbolName}`.toLowerCase().includes(trimmedQuery)
    )
    .slice(0, 12);
}

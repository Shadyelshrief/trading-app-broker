import { MarketIndexReference, MarketOption } from './market-indices.models';

export const MARKET_INDEX_OPTIONS: readonly MarketOption[] = [
  { label: 'All Markets', value: 'all' },
  { label: 'Saudi Arabian Stock Market', value: 'saudi' },
  { label: 'Dubai Stock Market', value: 'dfm' },
  { label: 'AbuDhabi Stock Market', value: 'adx' }
] as const;

export const MARKET_INDEX_REFERENCES: readonly MarketIndexReference[] = [
  {
    marketFilter: 'saudi',
    exchange: 'tadawul',
    indexId: 'tasi',
    index: 'TASI',
    name: 'Tadawul All Share Index',
    shortName: 'TASI',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL'
  },
  {
    marketFilter: 'saudi',
    exchange: 'tadawul',
    indexId: 'nomuc',
    index: 'NOMUC',
    name: 'Nomu Parallel Market Index',
    shortName: 'NOMU',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL'
  },
  {
    marketFilter: 'dfm',
    exchange: 'dfm',
    indexId: 'dfmgi',
    index: 'DFMGI',
    name: 'DFM General Index',
    shortName: 'DFMGI',
    marketName: 'Dubai Stock Market',
    marketShortName: 'DFM'
  },
  {
    marketFilter: 'dfm',
    exchange: 'dfm',
    indexId: 'dfmgiall',
    index: 'DFMGIALL',
    name: 'DFM All Shares Index',
    shortName: 'DFM All',
    marketName: 'Dubai Stock Market',
    marketShortName: 'DFM'
  },
  {
    marketFilter: 'adx',
    exchange: 'adx',
    indexId: 'fadx15',
    index: 'FADX15',
    name: 'FADX 15 Index',
    shortName: 'FADX 15',
    marketName: 'AbuDhabi Stock Market',
    marketShortName: 'ADX'
  },
  {
    marketFilter: 'adx',
    exchange: 'adx',
    indexId: 'adi',
    index: 'ADI',
    name: 'ADX General Index',
    shortName: 'ADI',
    marketName: 'AbuDhabi Stock Market',
    marketShortName: 'ADX'
  }
] as const;

export function getIndexReferencesForMarket(market: string): MarketIndexReference[] {
  if (market === 'all') {
    return [...MARKET_INDEX_REFERENCES];
  }

  return MARKET_INDEX_REFERENCES.filter((reference) => reference.marketFilter === market);
}

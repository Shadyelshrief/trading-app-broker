import { FullMarketRow } from '../models/full-market-row.model';

interface FullMarketReferenceRow {
  symbolId: string;
  symbolName: string;
  market: string;
  sector: string;
  status?: string;
  currency?: string;
}

export interface FullMarketAssetSource {
  symbol: string;
  marketCode?: string;
  name?: string;
  label?: string;
  sector?: string;
  status?: string;
  currency?: string;
}

const FULL_MARKET_REFERENCE_ROWS: readonly FullMarketReferenceRow[] = [
  { symbolId: 'IHC', symbolName: 'International Holding Company', market: 'ADX', sector: 'Industrials' },
  { symbolId: 'FAB', symbolName: 'First Abu Dhabi Bank', market: 'ADX', sector: 'Banks' },
  { symbolId: 'ADNOCDIST', symbolName: 'ADNOC Distribution', market: 'ADX', sector: 'Energy' },
  { symbolId: 'ALDAR', symbolName: 'Aldar Properties', market: 'ADX', sector: 'Real Estate' },
  { symbolId: 'ADCB', symbolName: 'Abu Dhabi Commercial Bank', market: 'ADX', sector: 'Banks' },
  { symbolId: 'MULTIPLY', symbolName: 'Multiply Group', market: 'ADX', sector: 'Investment' },
  { symbolId: 'EMAAR', symbolName: 'Emaar Properties', market: 'DFM', sector: 'Real Estate' },
  { symbolId: 'DEWA', symbolName: 'Dubai Electricity and Water Authority', market: 'DFM', sector: 'Utilities' },
  { symbolId: 'SALIK', symbolName: 'Salik Company', market: 'DFM', sector: 'Transport' },
  { symbolId: 'DFM', symbolName: 'Dubai Financial Market', market: 'DFM', sector: 'Financial Services' },
  { symbolId: 'TABREED', symbolName: 'Tabreed', market: 'DFM', sector: 'Utilities' },
  { symbolId: 'UNIONCOOP', symbolName: 'Union Coop', market: 'DFM', sector: 'Consumer Staples' }
] as const;

export function buildReferenceFullMarketRows(exchange: string): FullMarketRow[] {
  const normalizedExchange = exchange.trim().toUpperCase();

  return FULL_MARKET_REFERENCE_ROWS
    .filter((row) => row.market === normalizedExchange)
    .map((row) => createEmptyFullMarketRow(row));
}

export function buildFullMarketRowsFromAssets(
  exchange: string,
  assets: readonly FullMarketAssetSource[]
): FullMarketRow[] {
  const normalizedExchange = exchange.trim().toUpperCase();
  const referenceRows = new Map(
    FULL_MARKET_REFERENCE_ROWS
      .filter((row) => row.market === normalizedExchange)
      .map((row) => [row.symbolId, row] as const)
  );
  const seen = new Set<string>();

  return assets
    .map((asset) => {
      const symbolId = asset.symbol.trim().toUpperCase();
      const market = asset.marketCode?.trim().toUpperCase() || normalizedExchange;

      if (!symbolId || market !== normalizedExchange || seen.has(symbolId)) {
        return null;
      }

      seen.add(symbolId);
      const reference = referenceRows.get(symbolId);

      return createEmptyFullMarketRow({
        symbolId,
        symbolName: resolveAssetName(asset, symbolId) || reference?.symbolName || symbolId,
        market,
        sector: asset.sector?.trim() || reference?.sector || '',
        status: asset.status?.trim() || reference?.status,
        currency: asset.currency?.trim() || reference?.currency
      });
    })
    .filter((row): row is FullMarketRow => row !== null);
}

function resolveAssetName(asset: FullMarketAssetSource, symbolId: string): string {
  const name = asset.name?.trim();

  if (name) {
    return name;
  }

  const label = asset.label?.trim();

  if (!label) {
    return '';
  }

  const prefix = `${symbolId} - `;
  return label.toUpperCase().startsWith(prefix.toUpperCase()) ? label.slice(prefix.length).trim() : label;
}

function createEmptyFullMarketRow(row: FullMarketReferenceRow): FullMarketRow {
  return {
    symbolId: row.symbolId,
    symbolName: row.symbolName,
    market: row.market,
    sector: row.sector,
    status: row.status ?? 'ACTIVE',
    bidPrice: 0,
    bidQty: 0,
    offerPrice: 0,
    offerQty: 0,
    lastPrice: 0,
    lastTradeQty: 0,
    lastTradeTime: '--',
    openPrice: 0,
    previousClose: 0,
    highPrice: 0,
    lowPrice: 0,
    averagePrice: 0,
    change: 0,
    changePercent: 0,
    totalVolume: 0,
    turnover: 0,
    totalBidQty: 0,
    totalOfferQty: 0,
    numberOfTrades: 0,
    week52High: 0,
    week52Low: 0,
    peRatio: 0,
    pbRatio: 0,
    marketCap: 0,
    yield: 0,
    toleranceHigh: 0,
    toleranceLow: 0,
    currency: row.currency ?? 'AED',
    direction: 'UNCHANGED',
    updatedAt: 0,
    tradePrice: 0,
    tradeQuantity: 0,
    ratio: 0
  };
}

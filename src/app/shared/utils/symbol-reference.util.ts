export interface SharedSymbolOption {
  symbolId: string;
  symbolName: string;
  market: string;
  currency: string;
}

const SHARED_SYMBOL_OPTIONS: readonly SharedSymbolOption[] = [
  { symbolId: 'IHC', symbolName: 'International Holding Company', market: 'ADX', currency: 'AED' },
  { symbolId: 'FAB', symbolName: 'First Abu Dhabi Bank', market: 'ADX', currency: 'AED' },
  { symbolId: 'ADNOCDIST', symbolName: 'ADNOC Distribution', market: 'ADX', currency: 'AED' },
  { symbolId: 'ALDAR', symbolName: 'Aldar Properties', market: 'ADX', currency: 'AED' },
  { symbolId: 'ADCB', symbolName: 'Abu Dhabi Commercial Bank', market: 'ADX', currency: 'AED' },
  { symbolId: 'MULTIPLY', symbolName: 'Multiply Group', market: 'ADX', currency: 'AED' },
  { symbolId: 'EMAAR', symbolName: 'Emaar Properties', market: 'DFM', currency: 'AED' },
  { symbolId: 'DEWA', symbolName: 'Dubai Electricity and Water Authority', market: 'DFM', currency: 'AED' },
  { symbolId: 'SALIK', symbolName: 'Salik Company', market: 'DFM', currency: 'AED' },
  { symbolId: 'DFM', symbolName: 'Dubai Financial Market', market: 'DFM', currency: 'AED' },
  { symbolId: 'TABREED', symbolName: 'Tabreed', market: 'DFM', currency: 'AED' },
  { symbolId: 'UNIONCOOP', symbolName: 'Union Coop', market: 'DFM', currency: 'AED' },
  { symbolId: 'ARAMCO', symbolName: 'Saudi Aramco', market: 'TADAWUL', currency: 'SAR' },
  { symbolId: 'SABIC', symbolName: 'Saudi Basic Industries', market: 'TADAWUL', currency: 'SAR' },
  { symbolId: 'ALRAJHI', symbolName: 'Al Rajhi Bank', market: 'TADAWUL', currency: 'SAR' },
  { symbolId: 'SNB', symbolName: 'Saudi National Bank', market: 'TADAWUL', currency: 'SAR' },
  { symbolId: 'STC', symbolName: 'Saudi Telecom Company', market: 'TADAWUL', currency: 'SAR' }
] as const;

export function getSharedSymbolOptions(): SharedSymbolOption[] {
  return [...SHARED_SYMBOL_OPTIONS];
}

export function filterSharedSymbolOptions(query: string): SharedSymbolOption[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return getSharedSymbolOptions().slice(0, 12);
  }

  return SHARED_SYMBOL_OPTIONS
    .filter((option) =>
      `${option.symbolId} ${option.symbolName} ${option.market}`.toLowerCase().includes(normalized)
    )
    .slice(0, 12);
}

export function findSharedSymbolOption(symbolId: string, market?: string): SharedSymbolOption | null {
  const normalizedSymbolId = symbolId.trim().toUpperCase();
  const normalizedMarket = market?.trim().toUpperCase();

  return (
    SHARED_SYMBOL_OPTIONS.find(
      (option) =>
        option.symbolId === normalizedSymbolId &&
        (normalizedMarket === undefined || option.market === normalizedMarket)
    ) ?? null
  );
}

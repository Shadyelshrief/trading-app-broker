export interface ProductDetailsDialogState {
  title: string;
  route: string;
  section: 'pricing';
  screen: 'price-quote';
  context: {
    quote: Record<string, unknown> & {
      symbolId: string;
      symbolName: string;
      market: string;
    };
  };
}

export function buildProductDetailsDialogState(source: unknown): ProductDetailsDialogState | null {
  const record = toRecord(source);

  if (!record) {
    return null;
  }

  const raw = toRecord(record['raw']);
  const symbolId = firstString(record, raw, [
    'symbolId',
    'symbol',
    'securityId',
    'symbolShortName'
  ])?.toUpperCase();
  const marketValue = firstString(record, raw, [
    'market',
    'exchange',
    'marketShortName',
    'marketCode',
    'marketName',
    'venue'
  ]);
  const market = normalizeProductMarket(marketValue);

  if (!symbolId || !market) {
    return null;
  }

  const symbolName =
    firstString(record, raw, [
      'symbolName',
      'securityName',
      'assetsName',
      'assetName',
      'productName',
      'name'
    ]) ?? symbolId;
  const currency = firstString(record, raw, ['currency', 'currencyCode', 'currencyShortName']);
  const quote: ProductDetailsDialogState['context']['quote'] = {
    ...(raw ?? {}),
    ...record,
    symbolId,
    symbolName,
    market
  };

  if (currency) {
    quote['currency'] = currency;
  }

  delete quote['raw'];

  return {
    title: `Product Details - ${symbolId}`,
    route: `/app/pricing/price-quote/${market.toLowerCase()}/${symbolId.toLowerCase()}`,
    section: 'pricing',
    screen: 'price-quote',
    context: { quote }
  };
}

function firstString(
  primary: Record<string, unknown>,
  secondary: Record<string, unknown> | null,
  keys: readonly string[]
): string | null {
  for (const key of keys) {
    const value = primary[key] ?? secondary?.[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function normalizeProductMarket(value: string | null): string {
  const market = value?.trim() ?? '';
  const normalized = market.toUpperCase();

  if (normalized.includes('ABU DHABI') || normalized === 'ADX') {
    return 'ADX';
  }

  if (normalized.includes('DUBAI') || normalized === 'DFM') {
    return 'DFM';
  }

  if (normalized.includes('SAUDI') || normalized.includes('TADAWUL')) {
    return 'TADAWUL';
  }

  return normalized;
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

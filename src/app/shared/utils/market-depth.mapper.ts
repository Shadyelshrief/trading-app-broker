export type MarketDepthSide = 'BID' | 'OFFER';

export interface MarketDepthLevel {
  price: number;
  size: number;
  accumulated: number;
  split?: number;
  side: MarketDepthSide;
}

export interface ParsedMarketDepthBook {
  bids: MarketDepthLevel[];
  offers: MarketDepthLevel[];
  totalBidQuantity: number;
  totalBidOrders: number;
  totalOfferQuantity: number;
  totalOfferOrders: number;
  lastUpdated: number;
}

type UnknownRecord = Record<string, unknown>;

export function mapMbpMessageToDepthBook(message: unknown): ParsedMarketDepthBook {
  const record = toRecord(message);
  const bids = normalizeLevels(
    extractLevels(
      record,
      'BID',
      ['bids', 'bidLevels', 'bid_levels', 'buy', 'buyLevels', 'buy_levels']
    ),
    'BID',
    true,
    10
  );
  const offers = normalizeLevels(
    extractLevels(
      record,
      'OFFER',
      ['offers', 'asks', 'offerLevels', 'offer_levels', 'askLevels', 'ask_levels', 'sell', 'sellLevels']
    ),
    'OFFER',
    true,
    10
  );

  return finalizeBook(record, bids, offers);
}

export function mapMboMessageToDepthBook(message: unknown): ParsedMarketDepthBook {
  const record = toRecord(message);
  const bids = normalizeLevels(
    extractLevels(
      record,
      'BID',
      ['bids', 'bidOrders', 'bid_orders', 'buyOrders', 'buy_orders']
    ),
    'BID',
    false,
    10
  );
  const offers = normalizeLevels(
    extractLevels(
      record,
      'OFFER',
      ['offers', 'asks', 'offerOrders', 'offer_orders', 'askOrders', 'ask_orders', 'sellOrders']
    ),
    'OFFER',
    false,
    10
  );

  return finalizeBook(record, bids, offers);
}

function finalizeBook(
  record: UnknownRecord | null,
  bids: MarketDepthLevel[],
  offers: MarketDepthLevel[]
): ParsedMarketDepthBook {
  return {
    bids,
    offers,
    totalBidQuantity:
      toNumber(record?.['totalBidQuantity'] ?? record?.['total_bid_qty'] ?? record?.['bidTotalQty']) ??
      bids.reduce((sum, level) => sum + level.size, 0),
    totalBidOrders:
      toNumber(record?.['totalBidOrders'] ?? record?.['total_bid_orders'] ?? record?.['bidOrders']) ??
      bids.reduce((sum, level) => sum + (level.split ?? 1), 0),
    totalOfferQuantity:
      toNumber(record?.['totalOfferQuantity'] ?? record?.['total_offer_qty'] ?? record?.['offerTotalQty']) ??
      offers.reduce((sum, level) => sum + level.size, 0),
    totalOfferOrders:
      toNumber(record?.['totalOfferOrders'] ?? record?.['total_offer_orders'] ?? record?.['offerOrders']) ??
      offers.reduce((sum, level) => sum + (level.split ?? 1), 0),
    lastUpdated: resolveTimestamp(record?.['updatedAt'] ?? record?.['timestamp'] ?? record?.['ts']) ?? Date.now()
  };
}

function extractLevels(
  record: UnknownRecord | null,
  side: MarketDepthSide,
  candidateKeys: readonly string[]
): unknown[] {
  if (!record) {
    return [];
  }

  for (const key of candidateKeys) {
    const value = record[key];

    if (Array.isArray(value)) {
      return value;
    }
  }

  const genericLevels = Array.isArray(record['levels']) ? record['levels'] : null;

  if (!genericLevels) {
    return [];
  }

  return genericLevels.filter((entry) => {
    const levelRecord = toRecord(entry);
    const rawSide = toString(
      levelRecord?.['side'] ??
        levelRecord?.['bookSide'] ??
        levelRecord?.['orderSide']
    )?.toUpperCase();

    return rawSide === side || (side === 'BID' ? rawSide === 'BUY' : rawSide === 'SELL');
  });
}

function normalizeLevels(
  entries: readonly unknown[],
  side: MarketDepthSide,
  includeSplit: boolean,
  limit: number
): MarketDepthLevel[] {
  const mapped = entries
    .map((entry) => mapLevel(entry, side, includeSplit))
    .filter((level): level is MarketDepthLevel => level !== null)
    .sort((left, right) =>
      side === 'BID' ? right.price - left.price : left.price - right.price
    )
    .slice(0, limit);

  return mapped.map((level, index) => ({
    ...level,
    accumulated:
      level.accumulated > 0
        ? level.accumulated
        : mapped.slice(0, index + 1).reduce((sum, current) => sum + current.size, 0)
  }));
}

function mapLevel(entry: unknown, side: MarketDepthSide, includeSplit: boolean): MarketDepthLevel | null {
  const record = toRecord(entry);

  if (!record) {
    return null;
  }

  const price =
    toNumber(record['price'] ?? record['bid'] ?? record['offer'] ?? record['ask']) ?? 0;
  const size =
    toNumber(record['size'] ?? record['qty'] ?? record['quantity'] ?? record['volume']) ?? 0;

  if (price <= 0 && size <= 0) {
    return null;
  }

  return {
    price,
    size,
    accumulated:
      toNumber(record['accumulated'] ?? record['accQty'] ?? record['accumulatedQty']) ?? 0,
    split: includeSplit
      ? toNumber(record['split'] ?? record['orders'] ?? record['count'] ?? record['orderCount'])
      : undefined,
    side
  };
}

function toRecord(value: unknown): UnknownRecord | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as UnknownRecord;
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function resolveTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

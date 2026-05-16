import { buildTickTopic, normalizeTopic, WebSocketState } from '../../core/market-data';
import { buildReferenceFullMarketRows } from '../full-market/full-market-reference.data';
import { applyFeederTickToFullMarketRow, parseFullMarketFeederTick } from '../full-market/full-market-feed.mapper';
import { FullMarketRow } from '../models/full-market-row.model';
import { getDirectionClass, resolveDirection } from '../utils/direction.util';
import {
  TopSymbolRow,
  TopSymbolsConnectionState,
  TopSymbolsDirection,
  TopSymbolsMarketFilter,
  TopSymbolsViewKey
} from './top-symbols.models';

type UnknownRecord = Record<string, unknown>;

interface SymbolReference {
  symbolId: string;
  symbolName: string;
  symbolShortName: string;
  marketName: string;
  marketShortName: string;
  currency: string;
}

const MARKET_INFO: Record<string, { marketName: string; marketShortName: string; currency: string }> = {
  adx: { marketName: 'AbuDhabi Stock Market', marketShortName: 'ADX', currency: 'AED' },
  dfm: { marketName: 'Dubai Stock Market', marketShortName: 'DFM', currency: 'AED' },
  tadawul: { marketName: 'Saudi Arabian Stock Market', marketShortName: 'TADAWUL', currency: 'SAR' }
};

const SAUDI_SYMBOLS: readonly SymbolReference[] = [
  {
    symbolId: 'ARAMCO',
    symbolName: 'Saudi Aramco',
    symbolShortName: 'ARAMCO',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL',
    currency: 'SAR'
  },
  {
    symbolId: 'SABIC',
    symbolName: 'Saudi Basic Industries',
    symbolShortName: 'SABIC',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL',
    currency: 'SAR'
  },
  {
    symbolId: 'ALRAJHI',
    symbolName: 'Al Rajhi Bank',
    symbolShortName: 'ALRAJHI',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL',
    currency: 'SAR'
  },
  {
    symbolId: 'SNB',
    symbolName: 'Saudi National Bank',
    symbolShortName: 'SNB',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL',
    currency: 'SAR'
  },
  {
    symbolId: 'STC',
    symbolName: 'Saudi Telecom Company',
    symbolShortName: 'STC',
    marketName: 'Saudi Arabian Stock Market',
    marketShortName: 'TADAWUL',
    currency: 'SAR'
  }
] as const;

export function buildTopSymbolsTopic(exchange: string): string {
  return normalizeTopic(`market:${exchange}:top-symbols`);
}

export function buildTopSymbolsReferenceLookup(): ReadonlyMap<string, SymbolReference> {
  const adx = buildReferenceFullMarketRows('ADX').map(
    (row): SymbolReference => ({
      symbolId: row.symbolId,
      symbolName: row.symbolName,
      symbolShortName: row.symbolId,
      marketName: 'AbuDhabi Stock Market',
      marketShortName: 'ADX',
      currency: row.currency
    })
  );
  const dfm = buildReferenceFullMarketRows('DFM').map(
    (row): SymbolReference => ({
      symbolId: row.symbolId,
      symbolName: row.symbolName,
      symbolShortName: row.symbolId,
      marketName: 'Dubai Stock Market',
      marketShortName: 'DFM',
      currency: row.currency
    })
  );

  return new Map(
    [...adx, ...dfm, ...SAUDI_SYMBOLS].map((reference) => [
      `${reference.marketShortName === 'TADAWUL' ? 'tadawul' : reference.marketShortName.toLowerCase()}:${reference.symbolId}`,
      reference
    ])
  );
}

export function getTopSymbolsReferenceSymbols(exchange: string): readonly SymbolReference[] {
  const normalizedExchange = exchange.toLowerCase();

  if (normalizedExchange === 'tadawul') {
    return SAUDI_SYMBOLS;
  }

  return buildReferenceFullMarketRows(normalizedExchange.toUpperCase()).map(
    (row): SymbolReference => ({
      symbolId: row.symbolId,
      symbolName: row.symbolName,
      symbolShortName: row.symbolId,
      marketName: MARKET_INFO[normalizedExchange]?.marketName ?? `${normalizedExchange.toUpperCase()} Market`,
      marketShortName: MARKET_INFO[normalizedExchange]?.marketShortName ?? normalizedExchange.toUpperCase(),
      currency: row.currency
    })
  );
}

export function buildTopSymbolsTickTopics(exchange: string): string[] {
  return getTopSymbolsReferenceSymbols(exchange).map((reference) => buildTickTopic(exchange, reference.symbolId));
}

export function mapTopSymbolsPayload(
  payload: unknown,
  exchange: string,
  referenceLookup: ReadonlyMap<string, SymbolReference>
): TopSymbolRow[] {
  const entries = unwrapEntries(payload);

  return entries
    .map((entry) => mapTopSymbolRecord(entry, exchange, referenceLookup))
    .filter((row): row is TopSymbolRow => row !== null);
}

export function mapTopSymbolsTickPayloads(
  payloads: Record<string, unknown>,
  referenceLookup: ReadonlyMap<string, SymbolReference>
): TopSymbolRow[] {
  return Object.entries(payloads)
    .map(([topic, payload]) => mapTopSymbolTickPayload(payload, topic, referenceLookup))
    .filter((row): row is TopSymbolRow => row !== null);
}

export function mergeTopSymbolsRows(
  primaryRows: readonly TopSymbolRow[],
  fallbackRows: readonly TopSymbolRow[]
): TopSymbolRow[] {
  const merged = new Map<string, TopSymbolRow>();

  for (const row of fallbackRows) {
    merged.set(`${row.marketShortName}:${row.symbolId}`, row);
  }

  for (const row of primaryRows) {
    const key = `${row.marketShortName}:${row.symbolId}`;
    const previous = merged.get(key);

    merged.set(key, previous ? { ...previous, ...row, updatedAt: Math.max(previous.updatedAt, row.updatedAt) } : row);
  }

  return [...merged.values()];
}

export function sortTopSymbolRows(
  rows: readonly TopSymbolRow[],
  selectedView: TopSymbolsViewKey,
  limit: number
): TopSymbolRow[] {
  const sorted = [...rows].sort((left, right) => {
    switch (selectedView) {
      case 'MOST_ACTIVE_VOLUME':
        return right.totalVolume - left.totalVolume || right.updatedAt - left.updatedAt;
      case 'MOST_ACTIVE_VALUE':
        return right.turnover - left.turnover || right.updatedAt - left.updatedAt;
      case 'TOP_GAINERS_PERCENT':
        return right.changePercent - left.changePercent || right.updatedAt - left.updatedAt;
      case 'TOP_GAINERS_CHANGE':
        return right.change - left.change || right.updatedAt - left.updatedAt;
      case 'TOP_LOSERS_PERCENT':
        return left.changePercent - right.changePercent || right.updatedAt - left.updatedAt;
      case 'TOP_LOSERS_CHANGE':
        return left.change - right.change || right.updatedAt - left.updatedAt;
      default:
        return right.updatedAt - left.updatedAt;
    }
  });

  return sorted.slice(0, Math.max(1, limit));
}

export function directionClass(direction: TopSymbolsDirection): string {
  return getDirectionClass(direction);
}

export function directionGlyph(direction: TopSymbolsDirection): string {
  switch (direction) {
    case 'UP':
      return '&#8593;';
    case 'DOWN':
      return '&#8595;';
    default:
      return '&#8722;';
  }
}

export function mapConnectionState(state: WebSocketState | null): TopSymbolsConnectionState {
  if (!state) {
    return 'DISCONNECTED';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'CONNECTED';
  }

  if (state.status === 'reconnecting') {
    return 'RECONNECTING';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'CONNECTING';
  }

  return 'DISCONNECTED';
}

export function mapConnectionLabel(state: TopSymbolsConnectionState): string {
  switch (state) {
    case 'CONNECTED':
      return 'Feed live';
    case 'RECONNECTING':
      return 'Reconnecting...';
    case 'CONNECTING':
      return 'Connecting...';
    default:
      return 'Disconnected';
  }
}

function mapTopSymbolRecord(
  entry: unknown,
  exchange: string,
  referenceLookup: ReadonlyMap<string, SymbolReference>
): TopSymbolRow | null {
  const record = toRecord(entry);

  if (!record) {
    return null;
  }

  const normalizedExchange = (
    toString(record['exchange'] ?? record['market'] ?? record['marketShortName'] ?? record['venue']) ??
    exchange
  ).toLowerCase();
  const symbolId = toString(record['symbolId'] ?? record['symbol_id'] ?? record['symbol'] ?? record['id'])?.toUpperCase();

  if (!symbolId) {
    return null;
  }

  const reference = referenceLookup.get(`${normalizedExchange}:${symbolId}`);
  const marketInfo = MARKET_INFO[normalizedExchange] ?? {
    marketName: `${normalizedExchange.toUpperCase()} Market`,
    marketShortName: normalizedExchange.toUpperCase(),
    currency: 'AED'
  };
  const change =
    toNumber(record['change'] ?? record['netChange'] ?? record['net_change']) ?? 0;
  const changePercent =
    toNumber(record['changePercent'] ?? record['change_percent'] ?? record['netChangePercent']) ?? 0;
  const direction = resolveDirectionFromRecord(record, change);
  const marketShortName = reference?.marketShortName ?? marketInfo.marketShortName;

  return {
    marketName:
      toString(record['marketName'] ?? record['market_name']) ??
      reference?.marketName ??
      marketInfo.marketName,
    marketShortName,
    symbolName:
      toString(record['symbolName'] ?? record['symbol_name'] ?? record['name']) ??
      reference?.symbolName ??
      symbolId,
    symbolShortName:
      toString(record['symbolShortName'] ?? record['symbol_short_name'] ?? record['shortName']) ??
      reference?.symbolShortName ??
      symbolId,
    symbolId,
    changePercent,
    changeDirection: direction,
    totalVolume:
      toNumber(record['totalVolume'] ?? record['total_volume'] ?? record['volume']) ?? 0,
    turnover:
      toNumber(record['turnover'] ?? record['totalValue'] ?? record['total_value'] ?? record['value']) ?? 0,
    change,
    currency:
      toString(record['currency'] ?? record['ccy']) ??
      reference?.currency ??
      marketInfo.currency,
    lastPrice:
      toNumber(record['lastPrice'] ?? record['last_price'] ?? record['price'] ?? record['tradePrice']) ?? 0,
    updatedAt:
      resolveTimestamp(record['updatedAt'] ?? record['updated_at'] ?? record['timestamp'] ?? record['ts']) ??
      Date.now()
  };
}

function mapTopSymbolTickPayload(
  payload: unknown,
  topic: string,
  referenceLookup: ReadonlyMap<string, SymbolReference>
): TopSymbolRow | null {
  const tick = parseFullMarketFeederTick(payload, topic);

  if (!tick?.symbolId || !tick.exchange) {
    return null;
  }

  const reference = referenceLookup.get(`${tick.exchange.toLowerCase()}:${tick.symbolId.toUpperCase()}`);

  if (!reference) {
    return null;
  }

  const baseRow = createReferenceFullMarketRow(reference, tick.exchange);
  const nextRow = applyFeederTickToFullMarketRow(baseRow, tick);

  return {
    marketName: reference.marketName,
    marketShortName: reference.marketShortName,
    symbolName: reference.symbolName,
    symbolShortName: reference.symbolShortName,
    symbolId: reference.symbolId,
    changePercent: nextRow.changePercent,
    changeDirection: nextRow.direction,
    totalVolume: nextRow.totalVolume,
    turnover: nextRow.turnover,
    change: nextRow.change,
    currency: nextRow.currency,
    lastPrice: nextRow.lastPrice,
    updatedAt: nextRow.updatedAt
  };
}

function resolveDirectionFromRecord(record: UnknownRecord, change: number): TopSymbolsDirection {
  const raw = toString(record['changeDirection'] ?? record['change_direction'] ?? record['direction']);

  if (raw) {
    const normalized = raw.toUpperCase();

    if (normalized === 'UP' || normalized === 'RISING' || normalized === 'PLUS') {
      return 'UP';
    }

    if (normalized === 'DOWN' || normalized === 'FALLING' || normalized === 'MINUS') {
      return 'DOWN';
    }
  }

  return resolveDirection(change);
}

function unwrapEntries(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);

  if (!record) {
    return [];
  }

  const nested =
    (Array.isArray(record['items']) ? record['items'] : null) ??
    (Array.isArray(record['rows']) ? record['rows'] : null) ??
    (Array.isArray(record['symbols']) ? record['symbols'] : null) ??
    (Array.isArray(record['topSymbols']) ? record['topSymbols'] : null) ??
    (Array.isArray(record['top_symbols']) ? record['top_symbols'] : null);

  if (nested) {
    return nested;
  }

  return [record];
}

function toRecord(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload as UnknownRecord;
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

function createReferenceFullMarketRow(reference: SymbolReference, exchange: string): FullMarketRow {
  return {
    symbolId: reference.symbolId,
    symbolName: reference.symbolName,
    market: exchange.toUpperCase(),
    sector: '',
    status: 'ACTIVE',
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
    currency: reference.currency,
    direction: 'UNCHANGED',
    updatedAt: 0,
    tradePrice: 0,
    tradeQuantity: 0,
    ratio: 0
  };
}

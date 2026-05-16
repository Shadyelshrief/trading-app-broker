import { buildTradesTopic, parseTradesTopic, WebSocketState } from '../../core/market-data';
import { getDirectionClass, resolveDirection } from '../utils/direction.util';
import {
  SymbolOption,
  TimeSalesConnectionState,
  TimeSalesDirection,
  TimeSalesFilters,
  TimeSalesMarketFilter,
  TimeSalesRow
} from './time-sales.models';

type UnknownRecord = Record<string, unknown>;

const MARKET_NAMES: Record<string, { shortName: string; name: string; currency: string }> = {
  adx: { shortName: 'ADX', name: 'AbuDhabi Stock Market', currency: 'AED' },
  dfm: { shortName: 'DFM', name: 'Dubai Stock Market', currency: 'AED' },
  tadawul: { shortName: 'TADAWUL', name: 'Saudi Arabian Stock Market', currency: 'SAR' }
};

export function buildTimeSalesTopics(
  market: TimeSalesMarketFilter,
  allSymbols: boolean,
  symbol: SymbolOption | null
): string[] {
  if (allSymbols) {
    return getExchangeUniverse(market).map((exchange) => buildTradesTopic(exchange));
  }

  if (!symbol) {
    return [];
  }

  return [buildTradesTopic(resolveExchangeFromSymbol(symbol), symbol.symbolId)];
}

export function mapTradeMessageToTimeSalesRows(
  payload: unknown,
  topic: string,
  symbolLookup: ReadonlyMap<string, SymbolOption>
): TimeSalesRow[] {
  const entries = unwrapTradePayload(payload);

  return entries
    .map((entry, index) => mapTradeRecordToRow(entry, topic, symbolLookup, index))
    .filter((row): row is TimeSalesRow => row !== null);
}

export function applyTimeSalesFilters(
  rows: readonly TimeSalesRow[],
  filters: TimeSalesFilters
): TimeSalesRow[] {
  return rows.filter((row) => {
    if (filters.market !== 'all' && row.marketShortName !== marketShortNameForFilter(filters.market)) {
      return false;
    }

    if (!filters.allSymbols && filters.symbol && row.symbolId !== filters.symbol.symbolId) {
      return false;
    }

    if (row.executedQuantity < filters.minQuantity) {
      return false;
    }

    return true;
  });
}

export function prependTradeRows(
  existingRows: readonly TimeSalesRow[],
  incomingRows: readonly TimeSalesRow[],
  maxRows: number
): TimeSalesRow[] {
  if (incomingRows.length === 0) {
    return [...existingRows];
  }

  const incomingIds = new Set(incomingRows.map((row) => row.id));
  return [...incomingRows, ...existingRows.filter((row) => !incomingIds.has(row.id))].slice(0, maxRows);
}

export function directionClass(direction: TimeSalesDirection): string {
  return getDirectionClass(direction);
}

export function directionGlyph(direction: TimeSalesDirection): string {
  switch (direction) {
    case 'UP':
      return '&#8593;';
    case 'DOWN':
      return '&#8595;';
    default:
      return '&#8722;';
  }
}

export function mapConnectionState(state: WebSocketState | null): TimeSalesConnectionState {
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

export function mapConnectionLabel(state: TimeSalesConnectionState): string {
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

export function symbolDisplayValue(symbol: SymbolOption | null, fallbackQuery = ''): string {
  if (!symbol) {
    return fallbackQuery;
  }

  return `${symbol.symbolId} - ${symbol.symbolName}`;
}

function mapTradeRecordToRow(
  record: unknown,
  topic: string,
  symbolLookup: ReadonlyMap<string, SymbolOption>,
  index: number
): TimeSalesRow | null {
  const payloadRecord = toRecord(record);

  if (!payloadRecord) {
    return null;
  }

  const topicParts = safeParseTradesTopic(topic);
  const exchange = (
    toString(
      payloadRecord['exchange'] ??
        payloadRecord['market'] ??
        payloadRecord['marketShortName'] ??
        payloadRecord['venue']
    ) ?? topicParts.exchange
  ).toLowerCase();

  const symbolId = (
    toString(
      payloadRecord['symbolId'] ??
        payloadRecord['symbol_id'] ??
        payloadRecord['symbol'] ??
        payloadRecord['ticker']
    ) ?? topicParts.symbolId
  )?.toUpperCase();

  if (!symbolId) {
    return null;
  }

  const metadata = symbolLookup.get(`${exchange}:${symbolId}`) ?? symbolLookup.get(`${exchange}:${symbolId.toUpperCase()}`);
  const marketInfo = MARKET_NAMES[exchange] ?? {
    shortName: exchange.toUpperCase(),
    name: `${exchange.toUpperCase()} Market`,
    currency: 'AED'
  };
  const tradePrice =
    toNumber(
      payloadRecord['tradePrice'] ??
        payloadRecord['trade_price'] ??
        payloadRecord['price'] ??
        payloadRecord['last_price']
    ) ?? 0;
  const executedQuantity =
    toNumber(
      payloadRecord['executedQuantity'] ??
        payloadRecord['executed_quantity'] ??
        payloadRecord['quantity'] ??
        payloadRecord['qty'] ??
        payloadRecord['trade_qty'] ??
        payloadRecord['size']
    ) ?? 0;
  const receivedAt =
    resolveTimestamp(
      payloadRecord['timestamp'] ??
        payloadRecord['ts'] ??
        payloadRecord['executionTime'] ??
        payloadRecord['execution_time'] ??
        payloadRecord['tradeTime'] ??
        payloadRecord['trade_time'] ??
        payloadRecord['time']
    ) ?? Date.now();
  const executionTime = resolveTimeLabel(
    payloadRecord['executionTime'] ??
      payloadRecord['execution_time'] ??
      payloadRecord['tradeTime'] ??
      payloadRecord['trade_time'] ??
      payloadRecord['time'] ??
      payloadRecord['timestamp'],
    receivedAt
  );
  const direction = resolveTradeDirection(payloadRecord);

  return {
    id: buildTradeRowId(symbolId, executionTime, tradePrice, executedQuantity, payloadRecord['sequence'], index, receivedAt),
    symbolId,
    symbolName:
      toString(payloadRecord['symbolName'] ?? payloadRecord['symbol_name'] ?? payloadRecord['name']) ??
      metadata?.symbolName ??
      symbolId,
    marketShortName: metadata?.marketShortName ?? marketInfo.shortName,
    marketName: metadata?.marketName ?? marketInfo.name,
    executionTime,
    tradePrice,
    executedQuantity,
    splits:
      toNumber(
        payloadRecord['splits'] ??
          payloadRecord['splitCount'] ??
          payloadRecord['split_count']
      ) ?? 0,
    currency:
      toString(payloadRecord['currency'] ?? payloadRecord['ccy']) ??
      metadata?.currency ??
      marketInfo.currency,
    changeDirection: direction,
    receivedAt
  };
}

function buildTradeRowId(
  symbolId: string,
  executionTime: string,
  tradePrice: number,
  executedQuantity: number,
  sequence: unknown,
  index: number,
  receivedAt: number
): string {
  const sequenceLabel = toString(sequence) ?? `${index}-${receivedAt}`;
  return `${symbolId}-${executionTime}-${tradePrice}-${executedQuantity}-${sequenceLabel}`;
}

function resolveTradeDirection(record: UnknownRecord): TimeSalesDirection {
  const rawDirection = toString(
    record['direction'] ??
      record['changeDirection'] ??
      record['change_direction'] ??
      record['movement'] ??
      record['tickDirection']
  );

  if (rawDirection) {
    const normalized = rawDirection.trim().toUpperCase();

    if (normalized === 'UP' || normalized === 'RISING' || normalized === 'BUY' || normalized === 'PLUS') {
      return 'UP';
    }

    if (normalized === 'DOWN' || normalized === 'FALLING' || normalized === 'SELL' || normalized === 'MINUS') {
      return 'DOWN';
    }
  }

  const change = toNumber(record['change'] ?? record['netChange'] ?? record['net_change']);
  return resolveDirection(change ?? 0);
}

function unwrapTradePayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);

  if (!record) {
    return [];
  }

  const nestedArray =
    (Array.isArray(record['trades']) ? record['trades'] : null) ??
    (Array.isArray(record['items']) ? record['items'] : null) ??
    (Array.isArray(record['rows']) ? record['rows'] : null);

  if (nestedArray) {
    return nestedArray;
  }

  return [record];
}

function resolveExchangeFromSymbol(symbol: SymbolOption): string {
  if (symbol.marketShortName === 'TADAWUL') {
    return 'tadawul';
  }

  return symbol.marketShortName.toLowerCase();
}

function marketShortNameForFilter(market: TimeSalesMarketFilter): string {
  switch (market) {
    case 'tadawul':
      return 'TADAWUL';
    case 'dfm':
      return 'DFM';
    case 'adx':
      return 'ADX';
    default:
      return '';
  }
}

function getExchangeUniverse(market: TimeSalesMarketFilter): string[] {
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

function safeParseTradesTopic(topic: string): { exchange: string; symbolId?: string } {
  try {
    return parseTradesTopic(topic);
  } catch {
    return {
      exchange: 'adx'
    };
  }
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

function resolveTimeLabel(rawValue: unknown, fallbackTimestamp: number): string {
  if (typeof rawValue === 'string' && /^\d{2}:\d{2}:\d{2}/.test(rawValue.trim())) {
    return rawValue.trim().slice(0, 8);
  }

  const timestamp = resolveTimestamp(rawValue) ?? fallbackTimestamp;

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(timestamp);
}

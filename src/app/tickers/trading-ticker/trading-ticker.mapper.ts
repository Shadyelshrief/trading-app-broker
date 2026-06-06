import { buildTradesTopic, parseTradesTopic } from '../../core/market-data';
import { resolveDirection } from '../../market/utils/direction.util';
import { MarketTickerItem } from '../../shared/components/market-ticker/market-ticker.component';
import { getWatchListSymbolUniverse } from '../../watchlists/saved-watch-list/saved-watch-list.mapper';
import { SymbolOption, WatchListConfig } from '../../watchlists/saved-watch-list/saved-watch-list.models';
import { TickerMode, TickerSettings } from '../ticker-settings.models';
import { TradingTickerItem } from './trading-ticker.models';

type UnknownRecord = Record<string, unknown>;

const MAX_TICKER_TRADES = 120;

export function resolveTradingTickerSymbols(
  settings: TickerSettings,
  watchLists: readonly WatchListConfig[]
): SymbolOption[] {
  if (settings.symbols?.length) {
    return dedupeSymbols(settings.symbols);
  }

  if (settings.watchListId) {
    const watchList = watchLists.find((list) => list.id === settings.watchListId);

    if (watchList?.selectedSymbols?.length) {
      return dedupeSymbols(watchList.selectedSymbols);
    }
  }

  return getWatchListSymbolUniverse().filter((symbol) => {
    const marketMatches =
      !settings.market ||
      settings.market === 'all' ||
      symbol.marketShortName.toLowerCase() === settings.market.toLowerCase();
    const sectorMatches = !settings.sector || settings.sector === 'all' || symbol.sector === settings.sector;

    return marketMatches && sectorMatches;
  });
}

export function buildTradingTickerTopics(settings: TickerSettings, symbols: readonly SymbolOption[]): string[] {
  if (settings.symbols?.length || settings.watchListId || (settings.sector && settings.sector !== 'all')) {
    return symbols.map((symbol) => buildTradesTopic(resolveExchange(symbol), symbol.symbolId));
  }

  return resolveExchanges(settings.market).map((exchange) => buildTradesTopic(exchange));
}

export function mapTradePayloadToTradingTickerItems(
  payload: unknown,
  topic: string,
  symbols: readonly SymbolOption[]
): TradingTickerItem[] {
  const symbolLookup = new Map(symbols.map((symbol) => [`${resolveExchange(symbol)}:${symbol.symbolId.toUpperCase()}`, symbol]));

  return unwrapTradePayload(payload)
    .map((record, index) => mapTradeRecord(record, topic, symbolLookup, index))
    .filter((item): item is TradingTickerItem => item !== null);
}

export function mergeTradingTickerItems(
  current: readonly TradingTickerItem[],
  incoming: readonly TradingTickerItem[],
  mode: TickerMode | undefined
): TradingTickerItem[] {
  if (incoming.length === 0) {
    return [...current];
  }

  const next = [...incoming, ...current];

  if (mode === 'LATEST_PRICE') {
    const latestBySymbol = new Map<string, TradingTickerItem>();

    for (const item of next) {
      const key = `${item.market}:${item.symbolId}`;

      if (!latestBySymbol.has(key)) {
        latestBySymbol.set(key, item);
      }
    }

    return Array.from(latestBySymbol.values()).slice(0, MAX_TICKER_TRADES);
  }

  if (mode === 'ACCUMULATED_VOLUME_BY_PRICE') {
    const accumulated = new Map<string, TradingTickerItem>();

    for (const item of next) {
      const key = `${item.market}:${item.symbolId}:${item.tradePrice}`;
      const existing = accumulated.get(key);

      accumulated.set(key, {
        ...item,
        tradedQuantity: (existing?.tradedQuantity ?? 0) + item.tradedQuantity,
        receivedAt: Math.max(existing?.receivedAt ?? 0, item.receivedAt)
      });
    }

    return Array.from(accumulated.values())
      .sort((left, right) => right.receivedAt - left.receivedAt)
      .slice(0, MAX_TICKER_TRADES);
  }

  const incomingIds = new Set(incoming.map((item) => item.id));
  return [...incoming, ...current.filter((item) => !incomingIds.has(item.id))].slice(0, MAX_TICKER_TRADES);
}

export function mapTradingTickerItemToMarketTicker(item: TradingTickerItem): MarketTickerItem {
  return {
    id: item.id,
    primary: item.symbolId,
    secondary: item.symbolName,
    market: item.market,
    price: item.tradePrice,
    quantity: item.tradedQuantity,
    change: item.change,
    changePercent: item.changePercent,
    direction: item.changeDirection,
    time: item.executionTime,
    raw: item
  };
}

export function getTradingTickerSectors(settings: TickerSettings): string[] {
  const symbols = getWatchListSymbolUniverse().filter(
    (symbol) =>
      !settings.market ||
      settings.market === 'all' ||
      symbol.marketShortName.toLowerCase() === settings.market.toLowerCase()
  );

  return ['all', ...new Set(symbols.map((symbol) => symbol.sector).filter((sector): sector is string => Boolean(sector)))];
}

function mapTradeRecord(
  value: unknown,
  topic: string,
  symbolLookup: ReadonlyMap<string, SymbolOption>,
  index: number
): TradingTickerItem | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const parsedTopic = safeParseTradesTopic(topic);
  const exchange = (
    toString(record['exchange'] ?? record['market'] ?? record['marketShortName'] ?? record['venue']) ??
    parsedTopic.exchange
  ).toLowerCase();
  const symbolId = (
    toString(record['symbolId'] ?? record['symbol_id'] ?? record['symbol'] ?? record['ticker']) ??
    parsedTopic.symbolId
  )?.toUpperCase();

  if (!symbolId) {
    return null;
  }

  const metadata = symbolLookup.get(`${exchange}:${symbolId}`);
  const receivedAt =
    toTimestamp(record['timestamp'] ?? record['ts'] ?? record['executionTime'] ?? record['tradeTime']) ?? Date.now();
  const tradePrice =
    toNumber(record['tradePrice'] ?? record['trade_price'] ?? record['price'] ?? record['last_price']) ?? 0;
  const tradedQuantity =
    toNumber(record['tradedQuantity'] ?? record['tradeQuantity'] ?? record['executedQuantity'] ?? record['quantity'] ?? record['qty'] ?? record['size']) ?? 0;
  const change = toNumber(record['change'] ?? record['netChange'] ?? record['net_change']) ?? 0;
  const changePercent = toNumber(record['changePercent'] ?? record['change_percent']) ?? 0;

  return {
    id: `${exchange}:${symbolId}:${tradePrice}:${tradedQuantity}:${toString(record['sequence']) ?? `${index}-${receivedAt}`}`,
    symbolId,
    symbolName: toString(record['symbolName'] ?? record['symbol_name'] ?? record['name']) ?? metadata?.symbolName ?? symbolId,
    tradedQuantity,
    tradePrice,
    change,
    changePercent,
    changeDirection: resolveTradeDirection(record, change),
    market: metadata?.marketShortName ?? exchange.toUpperCase(),
    currency: toString(record['currency'] ?? record['ccy']) ?? metadata?.currency ?? 'AED',
    executionTime: formatTime(record['executionTime'] ?? record['execution_time'] ?? record['tradeTime'] ?? record['time'], receivedAt),
    receivedAt
  };
}

function resolveTradeDirection(record: UnknownRecord, change: number): TradingTickerItem['changeDirection'] {
  const direction = toString(record['direction'] ?? record['changeDirection'] ?? record['change_direction'])?.toUpperCase();

  if (direction === 'UP' || direction === 'DOWN' || direction === 'UNCHANGED') {
    return direction;
  }

  return resolveDirection(change);
}

function unwrapTradePayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);

  if (!record) {
    return [];
  }

  for (const key of ['trades', 'items', 'rows', 'data']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [record];
}

function resolveExchanges(market: TickerSettings['market']): string[] {
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

function resolveExchange(symbol: SymbolOption): string {
  return symbol.marketShortName === 'TADAWUL' ? 'tadawul' : symbol.marketShortName.toLowerCase();
}

function safeParseTradesTopic(topic: string): { exchange: string; symbolId?: string } {
  try {
    return parseTradesTopic(topic);
  } catch {
    return { exchange: 'adx' };
  }
}

function toRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
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
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function toTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

function formatTime(value: unknown, fallback: number): string {
  if (typeof value === 'string' && /^\d{2}:\d{2}:\d{2}/.test(value.trim())) {
    return value.trim().slice(0, 8);
  }

  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(toTimestamp(value) ?? fallback);
}

function dedupeSymbols(symbols: readonly SymbolOption[]): SymbolOption[] {
  const seen = new Set<string>();
  const result: SymbolOption[] = [];

  for (const symbol of symbols) {
    const key = `${symbol.marketShortName}:${symbol.symbolId}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(symbol);
    }
  }

  return result;
}

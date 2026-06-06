import { WebSocketState, buildTickTopic, parseTickTopic } from '../../core/market-data';
import { buildReferenceFullMarketRows } from '../../market/full-market/full-market-reference.data';
import {
  applyFeederTickToFullMarketRow,
  parseFullMarketFeederTick
} from '../../market/full-market/full-market-feed.mapper';
import { FullMarketRow } from '../../market/models/full-market-row.model';
import { getSharedSymbolOptions } from '../../shared/utils/symbol-reference.util';
import {
  SymbolOption,
  WatchListCondition,
  WatchListConfig,
  WatchListRow
} from './saved-watch-list.models';

const MARKET_NAMES: Record<string, string> = {
  ADX: 'AbuDhabi Stock Market',
  DFM: 'Dubai Stock Market',
  TADAWUL: 'Saudi Arabian Stock Market'
};

export function getWatchListSymbolUniverse(): SymbolOption[] {
  const fullMarketRows = [
    ...buildReferenceFullMarketRows('ADX'),
    ...buildReferenceFullMarketRows('DFM')
  ];
  const fullMarketLookup = new Map(fullMarketRows.map((row) => [`${row.market}:${row.symbolId}`, row]));

  return getSharedSymbolOptions().map((symbol) => {
    const reference = fullMarketLookup.get(`${symbol.market}:${symbol.symbolId}`);

    return {
      symbolId: symbol.symbolId,
      symbolName: symbol.symbolName,
      market: symbol.market,
      marketShortName: symbol.market,
      sector: reference?.sector,
      currency: symbol.currency
    };
  });
}

export function resolveSymbolsForWatchList(config: WatchListConfig): SymbolOption[] {
  const universe = getWatchListSymbolUniverse();

  if (config.sourceType === 'SELECTED_SYMBOLS') {
    return dedupeSymbols(config.selectedSymbols ?? []);
  }

  const filtered = universe.filter((symbol) => matchesSourceFilters(symbol, config));

  if (config.sourceType === 'FILTER') {
    return filtered;
  }

  return universe;
}

export function buildWatchListTickTopics(symbols: readonly SymbolOption[]): string[] {
  return symbols.map((symbol) => buildTickTopic(symbol.marketShortName, symbol.symbolId));
}

export function buildInitialWatchListRows(symbols: readonly SymbolOption[]): WatchListRow[] {
  return symbols.map((symbol) => toWatchListRow(createFullMarketRow(symbol)));
}

export function applyWatchListTickPayloads(
  rows: readonly WatchListRow[],
  payloads: Record<string, unknown>
): WatchListRow[] {
  const nextRows = new Map(rows.map((row) => [`${row.marketShortName}:${row.symbolId}`, row]));

  for (const [topic, payload] of Object.entries(payloads)) {
    if (topic === '__error') {
      continue;
    }

    const current = resolveCurrentRow(nextRows, topic);

    if (!current) {
      continue;
    }

    const tick = parseFullMarketFeederTick(payload, topic);

    if (!tick) {
      continue;
    }

    const nextFullRow = applyFeederTickToFullMarketRow(toFullMarketRow(current), tick);
    nextRows.set(`${nextFullRow.market}:${nextFullRow.symbolId}`, toWatchListRow(nextFullRow));
  }

  return [...nextRows.values()];
}

export function evaluateWatchListConditions(
  row: WatchListRow,
  conditions: WatchListCondition[]
): boolean {
  if (conditions.length === 0) {
    return true;
  }

  let result = evaluateExpression(row, conditions[0]);

  for (let index = 1; index < conditions.length; index += 1) {
    const condition = conditions[index];
    const current = evaluateExpression(row, condition);

    result = condition.join === 'OR' ? result || current : result && current;
  }

  return result;
}

export function mapConnectionTone(
  state: WebSocketState | null
): SavedWatchListViewModelTone {
  if (!state) {
    return 'disconnected';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'connected';
  }

  if (state.status === 'reconnecting') {
    return 'reconnecting';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'connecting';
  }

  return 'disconnected';
}

export function mapConnectionLabel(tone: SavedWatchListViewModelTone): string {
  switch (tone) {
    case 'connected':
      return 'Feed live';
    case 'reconnecting':
      return 'Reconnecting...';
    case 'connecting':
      return 'Connecting...';
    default:
      return 'Disconnected';
  }
}

type SavedWatchListViewModelTone = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

function matchesSourceFilters(symbol: SymbolOption, config: WatchListConfig): boolean {
  const filters = config.filters;

  if (!filters) {
    return true;
  }

  if (filters.market && filters.market !== 'all' && symbol.marketShortName.toLowerCase() !== filters.market.toLowerCase()) {
    return false;
  }

  if (filters.sector && filters.sector !== 'all' && symbol.sector !== filters.sector) {
    return false;
  }

  return true;
}

function dedupeSymbols(symbols: readonly SymbolOption[]): SymbolOption[] {
  const seen = new Set<string>();
  const result: SymbolOption[] = [];

  for (const symbol of symbols) {
    const key = `${symbol.marketShortName}:${symbol.symbolId}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(symbol);
  }

  return result;
}

function createFullMarketRow(symbol: SymbolOption): FullMarketRow {
  const reference = buildReferenceFullMarketRows(symbol.marketShortName).find((row) => row.symbolId === symbol.symbolId);

  if (reference) {
    return reference;
  }

  return {
    symbolId: symbol.symbolId,
    symbolName: symbol.symbolName,
    market: symbol.marketShortName,
    sector: symbol.sector ?? 'Unclassified',
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
    currency: symbol.currency,
    direction: 'UNCHANGED',
    updatedAt: 0,
    tradePrice: 0,
    tradeQuantity: 0,
    ratio: 0
  };
}

function toWatchListRow(row: FullMarketRow): WatchListRow {
  return {
    marketName: MARKET_NAMES[row.market] ?? `${row.market} Market`,
    marketShortName: row.market,
    symbolName: row.symbolName,
    symbolShortName: row.symbolId,
    symbolId: row.symbolId,
    remarks: row.status,
    status: row.status,
    bidPrice: row.bidPrice,
    bidSize: row.bidQty,
    offerPrice: row.offerPrice,
    offerSize: row.offerQty,
    openPrice: row.openPrice,
    lastPrice: row.lastPrice,
    lastTradeQty: row.lastTradeQty,
    lastTradeTime: row.lastTradeTime,
    changePercent: row.changePercent,
    changeDirection: row.direction,
    previousClosed: row.previousClose,
    highPrice: row.highPrice,
    lowPrice: row.lowPrice,
    averagePrice: row.averagePrice,
    numberOfTrades: row.numberOfTrades,
    totalVolume: row.totalVolume,
    turnover: row.turnover,
    week52High: row.week52High,
    week52Low: row.week52Low,
    peRatio: row.peRatio,
    marketCapitalization: row.marketCap,
    pbRatio: row.pbRatio,
    yield: row.yield,
    change: row.change,
    tradePrice: row.tradePrice,
    tradeQty: row.tradeQuantity,
    toleranceHigh: row.toleranceHigh,
    toleranceLow: row.toleranceLow,
    totalBidQty: row.totalBidQty,
    totalOfferQty: row.totalOfferQty,
    ratioOfferBid: row.ratio,
    currency: row.currency,
    updatedAt: row.updatedAt
  };
}

function toFullMarketRow(row: WatchListRow): FullMarketRow {
  return {
    symbolId: row.symbolId,
    symbolName: row.symbolName,
    market: row.marketShortName,
    sector: '',
    status: row.status ?? 'ACTIVE',
    bidPrice: row.bidPrice,
    bidQty: row.bidSize,
    offerPrice: row.offerPrice,
    offerQty: row.offerSize,
    lastPrice: row.lastPrice,
    lastTradeQty: row.lastTradeQty,
    lastTradeTime: row.lastTradeTime,
    openPrice: row.openPrice,
    previousClose: row.previousClosed,
    highPrice: row.highPrice,
    lowPrice: row.lowPrice,
    averagePrice: row.averagePrice,
    change: row.change,
    changePercent: row.changePercent,
    totalVolume: row.totalVolume,
    turnover: row.turnover,
    totalBidQty: row.totalBidQty,
    totalOfferQty: row.totalOfferQty,
    numberOfTrades: row.numberOfTrades,
    week52High: row.week52High,
    week52Low: row.week52Low,
    peRatio: row.peRatio,
    pbRatio: row.pbRatio,
    marketCap: row.marketCapitalization,
    yield: row.yield,
    toleranceHigh: row.toleranceHigh,
    toleranceLow: row.toleranceLow,
    currency: row.currency,
    direction: row.changeDirection,
    updatedAt: row.updatedAt,
    tradePrice: row.tradePrice,
    tradeQuantity: row.tradeQty,
    ratio: row.ratioOfferBid
  };
}

function resolveCurrentRow(rows: Map<string, WatchListRow>, topic: string): WatchListRow | undefined {
  try {
    const parsed = parseTickTopic(topic);
    return rows.get(`${parsed.exchange.toUpperCase()}:${parsed.symbolId.toUpperCase()}`);
  } catch {
    return undefined;
  }
}

function evaluateExpression(row: WatchListRow, condition: WatchListCondition): boolean {
  const left = getConditionFieldValue(row, condition.field);
  const right = Number(condition.value);

  if (!Number.isFinite(left) || !Number.isFinite(right)) {
    return false;
  }

  switch (condition.operator) {
    case '>':
      return left > right;
    case '>=':
      return left >= right;
    case '<':
      return left < right;
    case '<=':
      return left <= right;
    case '=':
      return left === right;
    case '!=':
      return left !== right;
    default:
      return false;
  }
}

function getConditionFieldValue(row: WatchListRow, field: string): number {
  switch (field) {
    case 'bidPrice':
      return row.bidPrice;
    case 'lastTradeQty':
      return row.lastTradeQty;
    case 'turnover':
      return row.turnover;
    case 'totalVolume':
      return row.totalVolume;
    case 'lastPrice':
      return row.lastPrice;
    case 'changePercent':
      return row.changePercent;
    case 'change':
      return row.change;
    case 'numberOfTrades':
      return row.numberOfTrades;
    default:
      return Number.NaN;
  }
}

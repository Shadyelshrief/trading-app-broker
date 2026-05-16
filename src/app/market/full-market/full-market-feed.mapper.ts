import { parseTickTopic } from '../../core/market-data';
import { FullMarketRow } from '../models/full-market-row.model';
import { resolveDirection } from '../utils/direction.util';

type UnknownRecord = Record<string, unknown>;

export interface FullMarketFeederTick {
  exchange?: string;
  symbolId?: string;
  status?: string;
  currency?: string;
  bidPrice?: number;
  bidQty?: number;
  offerPrice?: number;
  offerQty?: number;
  lastPrice?: number;
  lastTradeQty?: number;
  lastTradeTime?: string;
  openPrice?: number;
  previousClose?: number;
  highPrice?: number;
  lowPrice?: number;
  averagePrice?: number;
  change?: number;
  changePercent?: number;
  totalVolume?: number;
  turnover?: number;
  numberOfTrades?: number;
  tradePrice?: number;
  tradeQuantity?: number;
  totalBidQty?: number;
  totalOfferQty?: number;
  toleranceHigh?: number;
  toleranceLow?: number;
  week52High?: number;
  week52Low?: number;
  marketCap?: number;
  yield?: number;
  peRatio?: number;
  pbRatio?: number;
  updatedAt?: number;
}

export function parseFullMarketFeederTick(payload: unknown, topic: string): FullMarketFeederTick | null {
  const record = toRecord(payload);

  if (!record) {
    return null;
  }

  const parsedTopic = safeParseTickTopic(topic);

  return {
    exchange: parsedTopic?.exchange ?? toString(record['exchange'] ?? record['market'] ?? record['venue']),
    symbolId: parsedTopic?.symbolId ?? toString(record['symbolId'] ?? record['symbol'] ?? record['symbol_code']),
    status: toString(
      record['status'] ??
        record['symbolStatus'] ??
        record['symbol_status'] ??
        record['tradingStatus'] ??
        record['trading_status']
    ),
    currency: toString(record['currency']),
    bidPrice: toNumber(record['bidPrice'] ?? record['bid_price'] ?? record['bid']),
    bidQty: toNumber(record['bidQty'] ?? record['bid_qty'] ?? record['bidSize'] ?? record['bid_size']),
    offerPrice: toNumber(record['offerPrice'] ?? record['offer_price'] ?? record['askPrice'] ?? record['ask_price'] ?? record['ask']),
    offerQty: toNumber(record['offerQty'] ?? record['offer_qty'] ?? record['askQty'] ?? record['ask_qty'] ?? record['askSize'] ?? record['ask_size']),
    lastPrice: toNumber(record['lastPrice'] ?? record['last_price'] ?? record['ltp'] ?? record['tradePrice']),
    lastTradeQty: toNumber(record['lastTradeQty'] ?? record['last_trade_qty'] ?? record['tradeQty'] ?? record['trade_qty']),
    lastTradeTime: toString(record['lastTradeTime'] ?? record['last_trade_time'] ?? record['tradeTime'] ?? record['trade_time']),
    openPrice: toNumber(record['openPrice'] ?? record['open_price'] ?? record['open']),
    previousClose: toNumber(record['previousClose'] ?? record['previous_close'] ?? record['closePrice'] ?? record['close']),
    highPrice: toNumber(record['highPrice'] ?? record['high_price'] ?? record['high']),
    lowPrice: toNumber(record['lowPrice'] ?? record['low_price'] ?? record['low']),
    averagePrice: toNumber(record['averagePrice'] ?? record['average_price'] ?? record['avgPrice'] ?? record['avg_price']),
    change: toNumber(record['change']),
    changePercent: toNumber(record['changePercent'] ?? record['change_percent']),
    totalVolume: toNumber(record['totalVolume'] ?? record['volume'] ?? record['total_volume']),
    turnover: toNumber(record['turnover'] ?? record['valueTraded'] ?? record['value_traded']),
    numberOfTrades: toNumber(record['numberOfTrades'] ?? record['trades'] ?? record['number_of_trades']),
    tradePrice: toNumber(record['tradePrice'] ?? record['trade_price'] ?? record['lastTradePrice']),
    tradeQuantity: toNumber(record['tradeQuantity'] ?? record['trade_quantity'] ?? record['tradeQty'] ?? record['trade_qty']),
    totalBidQty: toNumber(record['totalBidQty'] ?? record['total_bid_qty'] ?? record['bidTotalQty'] ?? record['bid_total_qty']),
    totalOfferQty: toNumber(record['totalOfferQty'] ?? record['total_offer_qty'] ?? record['offerTotalQty'] ?? record['offer_total_qty'] ?? record['askTotalQty'] ?? record['ask_total_qty']),
    toleranceHigh: toNumber(record['toleranceHigh'] ?? record['tolerance_high']),
    toleranceLow: toNumber(record['toleranceLow'] ?? record['tolerance_low']),
    week52High: toNumber(record['week52High'] ?? record['week52_high'] ?? record['fiftyTwoWeekHigh']),
    week52Low: toNumber(record['week52Low'] ?? record['week52_low'] ?? record['fiftyTwoWeekLow']),
    marketCap: toNumber(record['marketCap'] ?? record['market_cap']),
    yield: toNumber(record['yield']),
    peRatio: toNumber(record['peRatio'] ?? record['pe_ratio'] ?? record['per']),
    pbRatio: toNumber(record['pbRatio'] ?? record['pb_ratio'] ?? record['pbr']),
    updatedAt: resolveTimestamp(record['updatedAt'] ?? record['timestamp'] ?? record['ts'])
  };
}

export function applyFeederTickToFullMarketRow(currentRow: FullMarketRow, tick: FullMarketFeederTick): FullMarketRow {
  const nextBidPrice = tick.bidPrice ?? currentRow.bidPrice;
  const nextBidQty = tick.bidQty ?? currentRow.bidQty;
  const nextOfferPrice = tick.offerPrice ?? currentRow.offerPrice;
  const nextOfferQty = tick.offerQty ?? currentRow.offerQty;
  const nextLastPrice = tick.lastPrice ?? currentRow.lastPrice;
  const nextPreviousClose = tick.previousClose ?? currentRow.previousClose;
  const canDeriveChange = nextPreviousClose > 0;
  const nextChange = tick.change ?? (canDeriveChange ? nextLastPrice - nextPreviousClose : currentRow.change);
  const nextChangePercent =
    tick.changePercent ??
    (canDeriveChange ? (nextChange / nextPreviousClose) * 100 : currentRow.changePercent);
  const nextTradePrice = tick.tradePrice ?? tick.lastPrice ?? currentRow.tradePrice;
  const nextTradeQuantity = tick.tradeQuantity ?? tick.lastTradeQty ?? currentRow.tradeQuantity;
  const nextTotalBidQty = tick.totalBidQty ?? tick.bidQty ?? currentRow.totalBidQty;
  const nextTotalOfferQty = tick.totalOfferQty ?? tick.offerQty ?? currentRow.totalOfferQty;
  const nextUpdatedAt = tick.updatedAt ?? Date.now();

  return {
    ...currentRow,
    market: tick.exchange?.toUpperCase() ?? currentRow.market,
    status: tick.status ?? currentRow.status,
    bidPrice: nextBidPrice,
    bidQty: nextBidQty,
    offerPrice: nextOfferPrice,
    offerQty: nextOfferQty,
    lastPrice: nextLastPrice,
    lastTradeQty: tick.lastTradeQty ?? currentRow.lastTradeQty,
    lastTradeTime: tick.lastTradeTime ?? formatTradeTime(nextUpdatedAt, currentRow.lastTradeTime),
    openPrice: tick.openPrice ?? currentRow.openPrice,
    previousClose: nextPreviousClose,
    highPrice: tick.highPrice ?? currentRow.highPrice,
    lowPrice: tick.lowPrice ?? currentRow.lowPrice,
    averagePrice: tick.averagePrice ?? currentRow.averagePrice,
    change: nextChange,
    changePercent: nextChangePercent,
    totalVolume: tick.totalVolume ?? currentRow.totalVolume,
    turnover: tick.turnover ?? currentRow.turnover,
    totalBidQty: nextTotalBidQty,
    totalOfferQty: nextTotalOfferQty,
    numberOfTrades: tick.numberOfTrades ?? currentRow.numberOfTrades,
    week52High: tick.week52High ?? currentRow.week52High,
    week52Low: tick.week52Low ?? currentRow.week52Low,
    peRatio: tick.peRatio ?? currentRow.peRatio,
    pbRatio: tick.pbRatio ?? currentRow.pbRatio,
    marketCap: tick.marketCap ?? currentRow.marketCap,
    yield: tick.yield ?? currentRow.yield,
    toleranceHigh: tick.toleranceHigh ?? currentRow.toleranceHigh,
    toleranceLow: tick.toleranceLow ?? currentRow.toleranceLow,
    currency: tick.currency ?? currentRow.currency,
    direction: resolveDirection(nextChange),
    updatedAt: nextUpdatedAt,
    tradePrice: nextTradePrice,
    tradeQuantity: nextTradeQuantity,
    ratio: nextTotalBidQty === 0 ? 0 : nextTotalOfferQty / nextTotalBidQty
  };
}

function toRecord(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as UnknownRecord;
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

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
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

function safeParseTickTopic(topic: string): { exchange: string; symbolId: string } | null {
  try {
    return parseTickTopic(topic);
  } catch {
    return null;
  }
}

function formatTradeTime(timestamp: number, fallback: string): string {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');

  return `${hours}:${minutes}:${seconds}`;
}

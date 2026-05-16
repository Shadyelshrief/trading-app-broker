import { FullMarketRow } from '../models/full-market-row.model';
import { resolveDirection } from './direction.util';

type UnknownRecord = Record<string, unknown>;

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : fallback;
  }

  return fallback;
}

function toString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function toRows(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((row): row is UnknownRecord => typeof row === 'object' && row !== null);
  }

  if (payload && typeof payload === 'object') {
    const record = payload as UnknownRecord;
    const nested = record['rows'] ?? record['symbols'] ?? record['data'] ?? record['payload'];

    if (Array.isArray(nested)) {
      return nested.filter((row): row is UnknownRecord => typeof row === 'object' && row !== null);
    }
  }

  return [];
}

export function parseFullMarketRows(payload: unknown): FullMarketRow[] {
  return toRows(payload).map((row) => {
    const lastPrice = toNumber(row['lastPrice'] ?? row['last_price'] ?? row['ltp']);
    const previousClose = toNumber(row['previousClose'] ?? row['previous_close'] ?? row['closePrice']);
    const change = toNumber(row['change'], lastPrice - previousClose);
    const changePercent =
      toNumber(row['changePercent'] ?? row['change_percent']) ||
      (previousClose === 0 ? 0 : (change / previousClose) * 100);
    const bidPrice = toNumber(row['bidPrice'] ?? row['bid_price']);
    const offerPrice = toNumber(row['offerPrice'] ?? row['offer_price'] ?? row['askPrice']);
    const totalBidQty = toNumber(row['totalBidQty'] ?? row['total_bid_qty'] ?? row['bidQty']);
    const totalOfferQty = toNumber(row['totalOfferQty'] ?? row['total_offer_qty'] ?? row['offerQty']);

    return {
      symbolId: toString(row['symbolId'] ?? row['symbol'] ?? row['symbol_code']),
      symbolName: toString(row['symbolName'] ?? row['name'] ?? row['securityName']),
      market: toString(row['market'] ?? row['exchange'] ?? row['venue']),
      sector: toString(row['sector'] ?? row['industry']),
      bidPrice,
      bidQty: toNumber(row['bidQty'] ?? row['bid_qty']),
      offerPrice,
      offerQty: toNumber(row['offerQty'] ?? row['offer_qty'] ?? row['askQty']),
      lastPrice,
      lastTradeQty: toNumber(row['lastTradeQty'] ?? row['last_trade_qty'] ?? row['tradeQty']),
      lastTradeTime: toString(row['lastTradeTime'] ?? row['last_trade_time'] ?? row['tradeTime']),
      openPrice: toNumber(row['openPrice'] ?? row['open_price']),
      previousClose,
      highPrice: toNumber(row['highPrice'] ?? row['high_price']),
      lowPrice: toNumber(row['lowPrice'] ?? row['low_price']),
      averagePrice: toNumber(row['averagePrice'] ?? row['average_price']),
      change,
      changePercent,
      totalVolume: toNumber(row['totalVolume'] ?? row['volume']),
      turnover: toNumber(row['turnover'] ?? row['valueTraded']),
      totalBidQty,
      totalOfferQty,
      numberOfTrades: toNumber(row['numberOfTrades'] ?? row['trades']),
      week52High: toNumber(row['week52High'] ?? row['high52'] ?? row['fiftyTwoWeekHigh']),
      week52Low: toNumber(row['week52Low'] ?? row['low52'] ?? row['fiftyTwoWeekLow']),
      peRatio: toNumber(row['peRatio'] ?? row['per']),
      pbRatio: toNumber(row['pbRatio'] ?? row['pbr']),
      marketCap: toNumber(row['marketCap'] ?? row['market_cap']),
      yield: toNumber(row['yield']),
      toleranceHigh: toNumber(row['toleranceHigh'] ?? row['upperLimit']),
      toleranceLow: toNumber(row['toleranceLow'] ?? row['lowerLimit']),
      currency: toString(row['currency'] ?? 'AED'),
      direction: resolveDirection(change),
      updatedAt: toNumber(row['updatedAt'] ?? row['timestamp'], Date.now()),
      tradePrice: toNumber(row['tradePrice'] ?? row['lastTradePrice'] ?? lastPrice),
      tradeQuantity: toNumber(row['tradeQuantity'] ?? row['lastTradeQty'] ?? row['tradeQty']),
      ratio: totalBidQty === 0 ? 0 : totalOfferQty / totalBidQty
    };
  });
}

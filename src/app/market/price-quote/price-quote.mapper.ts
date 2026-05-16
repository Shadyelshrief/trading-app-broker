import { FullMarketRow } from '../models/full-market-row.model';
import { getDirectionClass } from '../utils/direction.util';
import { formatPrice } from '../utils/formatters';
import { PriceQuoteChartPoint, PriceQuoteViewModel } from './price-quote.models';

export function calculateRangePositionPercent(lastPrice: number, low: number, high: number): number {
  if (!lastPrice || !low || !high || high <= low) {
    return 50;
  }

  return Math.max(0, Math.min(100, ((lastPrice - low) / (high - low)) * 100));
}

export function mapRowToPriceQuoteViewModel(
  row: FullMarketRow,
  chartData: PriceQuoteChartPoint[],
  availableSymbols: readonly FullMarketRow[],
  loading: boolean
): PriceQuoteViewModel {
  const rangeLow = row.week52Low || row.lowPrice || row.toleranceLow;
  const rangeHigh = row.week52High || row.highPrice || row.toleranceHigh;

  return {
    symbolId: row.symbolId,
    symbolName: row.symbolName,
    market: row.market,
    currency: row.currency,
    bidPrice: row.bidPrice,
    bidQty: row.bidQty,
    offerPrice: row.offerPrice,
    offerQty: row.offerQty,
    lastPrice: row.lastPrice,
    lastTradeTime: row.lastTradeTime,
    change: row.change,
    changePercent: row.changePercent,
    direction: row.direction,
    tradePrice: row.tradePrice,
    tradeQty: row.tradeQuantity,
    toleranceHigh: row.toleranceHigh,
    toleranceLow: row.toleranceLow,
    totalBidQty: row.totalBidQty,
    totalOfferQty: row.totalOfferQty,
    ratioOfferBid: row.ratio,
    marketCap: row.marketCap,
    yield: row.yield,
    per: row.peRatio,
    pbr: row.pbRatio,
    previousClose: row.previousClose,
    openPrice: row.openPrice,
    highPrice: row.highPrice,
    lowPrice: row.lowPrice,
    numberOfTrades: row.numberOfTrades,
    averagePrice: row.averagePrice,
    totalVolume: row.totalVolume,
    turnover: row.turnover,
    week52High: row.week52High,
    week52Low: row.week52Low,
    chartData,
    rangePositionPercent: calculateRangePositionPercent(row.lastPrice, rangeLow, rangeHigh),
    suspended: isSuspendedStatus(row.status),
    status: row.status,
    loading,
    lastUpdated: row.updatedAt,
    availableSymbols
  };
}

export function appendPriceQuotePoint(
  points: readonly PriceQuoteChartPoint[],
  row: FullMarketRow
): PriceQuoteChartPoint[] {
  if (row.lastPrice <= 0) {
    return [...points];
  }

  const nextPoint: PriceQuoteChartPoint = {
    time: row.lastTradeTime && row.lastTradeTime !== '--' ? row.lastTradeTime : formatTimestamp(row.updatedAt),
    price: row.lastPrice,
    direction: row.direction
  };
  const nextPoints = [...points];
  const previousPoint = nextPoints.at(-1);

  if (previousPoint && previousPoint.time === nextPoint.time) {
    nextPoints[nextPoints.length - 1] = nextPoint;
    return nextPoints;
  }

  nextPoints.push(nextPoint);

  return nextPoints.slice(-120);
}

export function resolveDirectionClass(direction: FullMarketRow['direction']): string {
  return getDirectionClass(direction);
}

export function formatRangeLabel(value: number): string {
  return formatPrice(value);
}

export function isSuspendedStatus(status: string | undefined): boolean {
  const normalized = status?.trim().toUpperCase();
  return normalized === 'SUSPENDED' || normalized === 'HALTED';
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp || Date.now());
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  const seconds = `${date.getSeconds()}`.padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

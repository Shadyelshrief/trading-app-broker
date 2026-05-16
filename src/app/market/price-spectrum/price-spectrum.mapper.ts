import { WebSocketState } from '../../core/market-data';
import { ParsedMarketDepthBook } from '../../shared/utils/market-depth.mapper';
import { PriceSpectrumRow } from './price-spectrum.models';

export function calculateRatioPercent(quantity: number, total: number): number {
  if (!quantity || !total) {
    return 0;
  }

  return Math.max(0, Math.min(100, (quantity / total) * 100));
}

export function mapDepthBookToPriceSpectrumRows(book: ParsedMarketDepthBook): PriceSpectrumRow[] {
  const rowMap = new Map<number, PriceSpectrumRow>();

  for (const bid of book.bids) {
    rowMap.set(bid.price, {
      ...(rowMap.get(bid.price) ?? createEmptyRow(bid.price)),
      bidQuantity: bid.size,
      bidOrders: bid.split,
      bidRatioPercent: calculateRatioPercent(bid.size, book.totalBidQuantity)
    });
  }

  for (const offer of book.offers) {
    rowMap.set(offer.price, {
      ...(rowMap.get(offer.price) ?? createEmptyRow(offer.price)),
      offerQuantity: offer.size,
      offerOrders: offer.split,
      offerRatioPercent: calculateRatioPercent(offer.size, book.totalOfferQuantity)
    });
  }

  return [...rowMap.values()].sort((left, right) => right.price - left.price);
}

export function mapConnectionState(
  state: WebSocketState | null
): 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED' {
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

export function mapConnectionLabel(
  state: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED'
): string {
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

function createEmptyRow(price: number): PriceSpectrumRow {
  return {
    price,
    bidRatioPercent: 0,
    offerRatioPercent: 0
  };
}

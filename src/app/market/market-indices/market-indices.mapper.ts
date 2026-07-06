import { normalizeTopic, WebSocketState } from '../../core/market-data';
import { getDirectionClass, resolveDirection } from '../utils/direction.util';

import { MarketIndexReference, MarketIndicesConnectionState, MarketIndexRow } from './market-indices.models';

type UnknownRecord = Record<string, unknown>;

export function createReferenceIndexRow(reference: MarketIndexReference): MarketIndexRow {
  return {
    index: reference.index,
    name: reference.name,
    shortName: reference.shortName,
    marketName: reference.marketName,
    marketShortName: reference.marketShortName,
    indexCurrentValue: 0,
    initialOpenValue: 0,
    highPrice: 0,
    lowPrice: 0,
    totalVolume: 0,
    totalValue: 0,
    previousClosed: 0,
    netChange: 0,
    changePercent: 0,
    changeDirection: 'UNCHANGED',
    updatedAt: 0
  };
}

export function buildIndexTopic(reference: MarketIndexReference): string {
  return normalizeTopic(`market:${reference.exchange}:index:${reference.indexId}`);
}

export function applyIndexPayload(
  currentRow: MarketIndexRow,
  payload: unknown,
  reference: MarketIndexReference
): MarketIndexRow {
  const record = toRecord(payload);

  if (!record) {
    return currentRow;
  }

  const nextCurrentValue =
    toNumber(record['currentValue'] ?? record['current_value'] ?? record['indexValue'] ?? record['lastPrice'] ?? record['value']) ??
    currentRow.indexCurrentValue;
  const nextInitialOpen =
    toNumber(record['initialOpenValue'] ?? record['initial_open_value'] ?? record['openValue'] ?? record['open']) ??
    currentRow.initialOpenValue;
  const nextHigh =
    toNumber(record['highPrice'] ?? record['high_price'] ?? record['high']) ?? currentRow.highPrice;
  const nextLow =
    toNumber(record['lowPrice'] ?? record['low_price'] ?? record['low']) ?? currentRow.lowPrice;
  const nextPreviousClosed =
    toNumber(record['previousClosed'] ?? record['previous_closed'] ?? record['previousClose'] ?? record['close']) ??
    currentRow.previousClosed;
  const nextNetChange =
    toNumber(record['netChange'] ?? record['net_change'] ?? record['change']) ??
    (nextPreviousClosed > 0 ? nextCurrentValue - nextPreviousClosed : currentRow.netChange);
  const nextChangePercent =
    toNumber(record['changePercent'] ?? record['change_percent'] ?? record['netChangePercent'] ?? record['net_change_percent']) ??
    (nextPreviousClosed > 0 ? (nextNetChange / nextPreviousClosed) * 100 : currentRow.changePercent);

  return {
    ...currentRow,
    index: reference.index,
    name: reference.name,
    shortName:
      toString(record['shortName'] ?? record['short_name'] ?? record['indexShortName']) ?? reference.shortName,
    marketName: reference.marketName,
    marketShortName: reference.marketShortName,
    indexCurrentValue: nextCurrentValue,
    initialOpenValue: nextInitialOpen,
    highPrice: nextHigh,
    lowPrice: nextLow,
    totalVolume:
      toNumber(record['totalVolume'] ?? record['total_volume'] ?? record['volume']) ?? currentRow.totalVolume,
    totalValue:
      toNumber(record['totalValue'] ?? record['total_value'] ?? record['turnover'] ?? record['valueTraded']) ??
      currentRow.totalValue,
    previousClosed: nextPreviousClosed,
    netChange: nextNetChange,
    changePercent: nextChangePercent,
    changeDirection: resolveDirection(nextNetChange),
    updatedAt: resolveTimestamp(record['updatedAt'] ?? record['updated_at'] ?? record['timestamp'] ?? record['ts']) ?? Date.now()
  };
}

export function mapConnectionState(state: WebSocketState | null): MarketIndicesConnectionState {
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

export function directionClass(row: MarketIndexRow): string {
  return getDirectionClass(row.changeDirection);
}

function toRecord(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
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
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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

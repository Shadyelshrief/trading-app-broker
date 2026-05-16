import { WebSocketState } from '../../market-data';

import {
  HeaderConnectionTone,
  HeaderMarketSessionStatus,
  HeaderMarketStatusSnapshot,
  HeaderMarketStatusTone
} from './header-market-status.models';

type UnknownRecord = Record<string, unknown>;

export function createEmptyHeaderMarketStatusSnapshot(): HeaderMarketStatusSnapshot {
  return {
    marketStatus: 'Unknown',
    statusTone: 'neutral',
    indexValue: null,
    change: null,
    changePercent: null,
    changeTone: 'neutral',
    numberOfTrades: null,
    totalVolume: null,
    turnover: null,
    updatedAt: null
  };
}

export function mapHeaderMarketStatus(
  summaryPayload: unknown,
  statusPayload: unknown,
  indexPayload: unknown
): HeaderMarketStatusSnapshot {
  const summary = toRecord(summaryPayload);
  const status = toRecord(statusPayload);
  const index = toRecord(indexPayload);

  const marketStatus = resolveMarketStatus(status, summary, index);
  const indexValue = firstNumber(
    index,
    ['currentValue', 'current_value', 'indexValue', 'index_value', 'lastPrice', 'last_price', 'value', 'price']
  );
  const change = firstNumber(index, ['netChange', 'net_change', 'change', 'priceChange', 'price_change']);
  const changePercent = firstNumber(index, [
    'netChangePercent',
    'net_change_percent',
    'changePercent',
    'change_percent',
    'percentChange',
    'percent_change'
  ]);
  const numberOfTrades = firstNumber(summary, ['numberOfTrades', 'number_of_trades', 'trades', 'trade_count']);
  const totalVolume = firstNumber(summary, ['totalVolume', 'total_volume', 'volume', 'totalVolumeTraded']);
  const turnover = firstNumber(summary, ['turnover', 'valueTraded', 'value_traded', 'totalValue']);
  const updatedAt = firstNumber(index, ['timestamp', 'updatedAt', 'updated_at', 'ts']) ??
    firstNumber(summary, ['timestamp', 'updatedAt', 'updated_at', 'ts']) ??
    firstNumber(status, ['timestamp', 'updatedAt', 'updated_at', 'ts']) ??
    null;

  return {
    marketStatus,
    statusTone: resolveStatusTone(marketStatus),
    indexValue,
    change,
    changePercent,
    changeTone: resolveChangeTone(change, changePercent),
    numberOfTrades,
    totalVolume,
    turnover,
    updatedAt
  };
}

export function withDerivedMarketStatus(
  snapshot: HeaderMarketStatusSnapshot,
  options: {
    hasSummaryPayload: boolean;
    hasIndexPayload: boolean;
    connectionTone: HeaderConnectionTone;
  }
): HeaderMarketStatusSnapshot {
  if (snapshot.marketStatus !== 'Unknown') {
    return snapshot;
  }

  const hasLiveMarketSignals =
    options.hasSummaryPayload ||
    snapshot.numberOfTrades !== null ||
    snapshot.totalVolume !== null ||
    snapshot.turnover !== null;
  const hasLiveIndexSignals = options.hasIndexPayload || snapshot.indexValue !== null;
  const canInferOpen =
    options.connectionTone === 'connected' && (hasLiveMarketSignals || hasLiveIndexSignals);

  if (!canInferOpen) {
    return snapshot;
  }

  return {
    ...snapshot,
    marketStatus: 'Opened',
    statusTone: 'positive'
  };
}

export function mapConnectionTone(state: WebSocketState | null): HeaderConnectionTone {
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

export function mapConnectionLabel(tone: HeaderConnectionTone): string {
  switch (tone) {
    case 'connected':
      return 'Feed live';
    case 'reconnecting':
      return 'Reconnecting';
    case 'connecting':
      return 'Connecting';
    default:
      return 'Disconnected';
  }
}

export function formatMarketTime(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone
  }).format(now);
}

export function formatMarketDate(now: Date, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone
  }).format(now);
}

function toRecord(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  return payload as UnknownRecord;
}

function firstNumber(record: UnknownRecord | null, keys: readonly string[]): number | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = toNumber(record[key]);

    if (value !== null) {
      return value;
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

function firstString(record: UnknownRecord | null, keys: readonly string[]): string | null {
  if (!record) {
    return null;
  }

  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function resolveMarketStatus(
  status: UnknownRecord | null,
  summary: UnknownRecord | null,
  index: UnknownRecord | null
): HeaderMarketSessionStatus {
  const raw = findStatusString(status) ?? findStatusString(summary) ?? findStatusString(index);

  if (raw) {
    const normalized = raw.trim().toLowerCase().replace(/[_-]+/g, ' ');

    if (normalized.includes('pre open')) {
      return 'Pre Open';
    }

    if (normalized.includes('pre close')) {
      return 'Pre Close';
    }

    if (normalized.includes('open')) {
      return 'Opened';
    }

    if (normalized.includes('close')) {
      return 'Closed';
    }

    if (
      normalized.includes('regular') ||
      normalized.includes('continuous') ||
      normalized.includes('trading') ||
      normalized.includes('active') ||
      normalized.includes('live')
    ) {
      return 'Opened';
    }
  }

  const openFlag = findBooleanFlag(status) ?? findBooleanFlag(summary) ?? findBooleanFlag(index);

  if (openFlag !== null) {
    return openFlag ? 'Opened' : 'Closed';
  }

  return 'Unknown';
}

function findStatusString(record: UnknownRecord | null): string | null {
  if (!record) {
    return null;
  }

  const direct = firstString(record, [
    'status',
    'marketStatus',
    'market_status',
    'session',
    'sessionStatus',
    'session_status',
    'tradingStatus',
    'trading_status',
    'marketPhase',
    'market_phase',
    'sessionPhase',
    'session_phase',
    'phase',
    'state',
    'tradingState',
    'trading_state'
  ]);

  if (direct) {
    return direct;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = findStatusString(value as UnknownRecord);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function findBooleanFlag(record: UnknownRecord | null): boolean | null {
  if (!record) {
    return null;
  }

  for (const key of [
    'isOpen',
    'is_open',
    'marketOpen',
    'market_open',
    'sessionOpen',
    'session_open',
    'open'
  ]) {
    const resolved = toBoolean(record[key]);

    if (resolved !== null) {
      return resolved;
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = findBooleanFlag(value as UnknownRecord);

      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

function toBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();

    if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
      return true;
    }

    if (normalized === 'false' || normalized === '0' || normalized === 'no') {
      return false;
    }
  }

  if (typeof value === 'number') {
    if (value === 1) {
      return true;
    }

    if (value === 0) {
      return false;
    }
  }

  return null;
}

function resolveStatusTone(status: HeaderMarketSessionStatus): HeaderMarketStatusTone {
  switch (status) {
    case 'Opened':
      return 'positive';
    case 'Pre Open':
    case 'Pre Close':
      return 'neutral';
    case 'Closed':
      return 'negative';
    default:
      return 'neutral';
  }
}

function resolveChangeTone(change: number | null, changePercent: number | null): HeaderMarketStatusTone {
  const candidate = change ?? changePercent;

  if (candidate === null || candidate === 0) {
    return 'neutral';
  }

  return candidate > 0 ? 'positive' : 'negative';
}

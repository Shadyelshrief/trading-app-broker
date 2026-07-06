import { WebSocketState } from '../../core/market-data';

import {
  MarketIndexPoint,
  MarketParticipantStatistic,
  MarketParticipantType,
  MarketSummaryConnectionState,
  MarketSummaryDirection,
  MarketSummarySnapshot,
  MarketSummaryStatus
} from './market-summary.models';

type UnknownRecord = Record<string, unknown>;

const PARTICIPANT_ORDER: readonly MarketParticipantType[] = [
  'National',
  'Arab',
  'Foreigners',
  'Institution',
  'Retail'
] as const;

export function createDefaultParticipantStatistics(): MarketParticipantStatistic[] {
  return PARTICIPANT_ORDER.map((type) => ({
    type,
    buy: 0,
    sell: 0,
    net: 0
  }));
}

export function createEmptyMarketSummarySnapshot(indexName: string): MarketSummarySnapshot {
  return {
    indexName,
    marketStatus: null,
    indexCurrentValue: null,
    change: null,
    changePercent: null,
    changeDirection: 'UNCHANGED',
    totalTrades: null,
    totalVolume: null,
    turnover: null,
    symbolsSummary: {
      traded: null,
      up: null,
      down: null,
      unchanged: null
    },
    statistics: [],
    lastUpdated: null
  };
}

export function mapMarketSummarySnapshot(
  summaryPayload: unknown,
  statusPayload: unknown,
  indexPayload: unknown,
  fallbackIndexName: string
): MarketSummarySnapshot {
  const summary = toRecord(summaryPayload);
  const status = toRecord(statusPayload);
  const index = toRecord(indexPayload);
  const marketStatus = resolveMarketStatus(status, summary, index);
  const indexCurrentValue = firstNumberDeep(index, [
    'currentValue',
    'current_value',
    'indexValue',
    'index_value',
    'lastPrice',
    'last_price',
    'value',
    'price'
  ]);
  const change = firstNumberDeep(index, [
    'netChange',
    'net_change',
    'change',
    'priceChange',
    'price_change',
    'difference'
  ]);
  const changePercent = firstNumberDeep(index, [
    'netChangePercent',
    'net_change_percent',
    'changePercent',
    'change_percent',
    'percentChange',
    'percent_change'
  ]);
  const totalTrades = firstNumberDeep(summary, [
    'numberOfTrades',
    'number_of_trades',
    'trades',
    'tradeCount',
    'trade_count'
  ]);
  const totalVolume = firstNumberDeep(summary, [
    'totalVolume',
    'total_volume',
    'volume',
    'totalVolumeTraded',
    'total_volume_traded'
  ]);
  const turnover = firstNumberDeep(summary, [
    'turnover',
    'valueTraded',
    'value_traded',
    'totalValue',
    'total_value'
  ]);

  return {
    indexName:
      firstStringDeep(index, ['indexName', 'index_name', 'name', 'displayName', 'display_name']) ??
      fallbackIndexName,
    marketStatus,
    indexCurrentValue,
    change,
    changePercent,
    changeDirection: resolveDirection(change, changePercent),
    totalTrades,
    totalVolume,
    turnover,
    symbolsSummary: {
      traded: firstNumberDeep(summary, ['traded', 'tradedSymbols', 'traded_symbols', 'symbolsTraded']),
      up: firstNumberDeep(summary, ['up', 'advancers', 'gainers', 'upSymbols', 'up_symbols']),
      down: firstNumberDeep(summary, ['down', 'decliners', 'losers', 'downSymbols', 'down_symbols']),
      unchanged: firstNumberDeep(summary, [
        'unchanged',
        'flat',
        'unchangedSymbols',
        'unchanged_symbols'
      ])
    },
    statistics: resolveParticipantStatistics(summary, status, index),
    lastUpdated:
      firstNumberDeep(index, ['timestamp', 'updatedAt', 'updated_at', 'ts']) ??
      firstNumberDeep(summary, ['timestamp', 'updatedAt', 'updated_at', 'ts']) ??
      firstNumberDeep(status, ['timestamp', 'updatedAt', 'updated_at', 'ts']) ??
      null
  };
}

export function appendIndexPoint(
  currentPoints: readonly MarketIndexPoint[],
  snapshot: MarketSummarySnapshot,
  timeZone: string
): MarketIndexPoint[] {
  if (snapshot.indexCurrentValue === null) {
    return [...currentPoints];
  }

  const pointTimestamp = snapshot.lastUpdated ?? Date.now();
  const point = {
    time: formatPointTime(pointTimestamp, timeZone),
    value: snapshot.indexCurrentValue
  } satisfies MarketIndexPoint;
  const points = [...currentPoints];
  const previousPoint = points.at(-1);

  if (previousPoint && previousPoint.time === point.time) {
    points[points.length - 1] = point;
    return points;
  }

  if (previousPoint && previousPoint.value === point.value && points.length > 1) {
    return points;
  }

  points.push(point);

  return points.slice(-180);
}

export function mapConnectionState(state: WebSocketState | null): MarketSummaryConnectionState {
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

export function formatStatusLabel(status: MarketSummaryStatus): string {
  switch (status) {
    case 'OPENED':
      return 'Opened';
    case 'PRE_OPEN':
      return 'Pre Open';
    case 'PRE_CLOSE':
      return 'Pre Close';
    default:
      return 'Closed';
  }
}

function resolveMarketStatus(
  status: UnknownRecord | null,
  summary: UnknownRecord | null,
  index: UnknownRecord | null
): MarketSummaryStatus | null {
  const raw = findStatusString(status) ?? findStatusString(summary) ?? findStatusString(index);

  if (raw) {
    const normalized = raw.toLowerCase().replace(/[_-]+/g, ' ');

    if (normalized.includes('pre open')) {
      return 'PRE_OPEN';
    }

    if (normalized.includes('pre close')) {
      return 'PRE_CLOSE';
    }

    if (
      normalized.includes('open') ||
      normalized.includes('regular') ||
      normalized.includes('continuous') ||
      normalized.includes('active') ||
      normalized.includes('live') ||
      normalized.includes('trading')
    ) {
      return 'OPENED';
    }

    if (normalized.includes('close')) {
      return 'CLOSED';
    }
  }

  const openFlag = findBooleanFlag(status) ?? findBooleanFlag(summary) ?? findBooleanFlag(index);

  if (openFlag !== null) {
    return openFlag ? 'OPENED' : 'CLOSED';
  }

  return null;
}

function resolveDirection(
  change: number | null,
  changePercent: number | null
): MarketSummaryDirection {
  const candidate = change ?? changePercent;

  if (candidate === null || candidate === 0) {
    return 'UNCHANGED';
  }

  return candidate > 0 ? 'UP' : 'DOWN';
}

function resolveParticipantStatistics(
  summary: UnknownRecord | null,
  status: UnknownRecord | null,
  index: UnknownRecord | null
): MarketParticipantStatistic[] {
  const collections = [summary, status, index]
    .map((payload) => extractStatisticsCollection(payload))
    .filter((payload): payload is unknown[] | UnknownRecord => payload !== null);

  if (collections.length === 0) {
    return createDefaultParticipantStatistics();
  }

  const mapped = new Map<MarketParticipantType, MarketParticipantStatistic>();

  for (const collection of collections) {
    if (Array.isArray(collection)) {
      for (const entry of collection) {
        const statistic = parseStatisticEntry(entry);

        if (statistic) {
          mapped.set(statistic.type, statistic);
        }
      }
      continue;
    }

    for (const [key, value] of Object.entries(collection)) {
      const statistic = parseStatisticEntry({ ...(toRecord(value) ?? {}), type: key });

      if (statistic) {
        mapped.set(statistic.type, statistic);
      }
    }
  }

  return PARTICIPANT_ORDER.map(
    (type) =>
      mapped.get(type) ?? {
        type,
        buy: 0,
        sell: 0,
        net: 0
      }
  );
}

function extractStatisticsCollection(payload: UnknownRecord | null): unknown[] | UnknownRecord | null {
  if (!payload) {
    return null;
  }

  for (const key of [
    'participantStatistics',
    'participant_statistics',
    'participants',
    'participantStats',
    'participant_stats',
    'tradingStatistics',
    'trading_statistics',
    'investorBreakdown',
    'investor_breakdown',
    'statistics'
  ]) {
    const value = payload[key];

    if (Array.isArray(value)) {
      return value;
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as UnknownRecord;
    }
  }

  for (const value of Object.values(payload)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = extractStatisticsCollection(value as UnknownRecord);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function parseStatisticEntry(entry: unknown): MarketParticipantStatistic | null {
  const record = toRecord(entry);

  if (!record) {
    return null;
  }

  const type = normalizeParticipantType(
    firstStringDeep(record, ['type', 'category', 'participant', 'label', 'name'])
  );

  if (!type) {
    return null;
  }

  const buy = firstNumberDeep(record, ['buy', 'buyValue', 'buy_value', 'purchases']) ?? 0;
  const sell = firstNumberDeep(record, ['sell', 'sellValue', 'sell_value', 'sales']) ?? 0;
  const net = firstNumberDeep(record, ['net', 'netValue', 'net_value']) ?? buy - sell;

  return {
    type,
    buy,
    sell,
    net
  };
}

function normalizeParticipantType(value: string | null): MarketParticipantType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized.includes('national') || normalized.includes('local')) {
    return 'National';
  }

  if (normalized.includes('arab')) {
    return 'Arab';
  }

  if (normalized.includes('foreign')) {
    return 'Foreigners';
  }

  if (normalized.includes('institution')) {
    return 'Institution';
  }

  if (normalized.includes('retail') || normalized.includes('individual')) {
    return 'Retail';
  }

  return null;
}

function formatPointTime(timestamp: number, timeZone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone
  }).format(new Date(timestamp));
}

function toRecord(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload as UnknownRecord;
}

function firstStringDeep(record: UnknownRecord | null, keys: readonly string[]): string | null {
  if (!record) {
    return null;
  }

  const direct = firstString(record, keys);

  if (direct) {
    return direct;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = firstStringDeep(value as UnknownRecord, keys);

      if (nested) {
        return nested;
      }
    }
  }

  return null;
}

function firstString(record: UnknownRecord, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function firstNumberDeep(record: UnknownRecord | null, keys: readonly string[]): number | null {
  if (!record) {
    return null;
  }

  const direct = firstNumber(record, keys);

  if (direct !== null) {
    return direct;
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const nested = firstNumberDeep(value as UnknownRecord, keys);

      if (nested !== null) {
        return nested;
      }
    }
  }

  return null;
}

function firstNumber(record: UnknownRecord, keys: readonly string[]): number | null {
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

  for (const key of ['isOpen', 'is_open', 'marketOpen', 'market_open', 'sessionOpen', 'session_open', 'open']) {
    const value = toBoolean(record[key]);

    if (value !== null) {
      return value;
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

import { HttpParams } from '@angular/common/http';

import type { SharedSymbolOption } from '../../shared/utils/symbol-reference.util';
import type {
  ChartComparisonDataRequest,
  ChartDataRequest,
  ChartInstrument,
  ChartPoint,
  ChartRenderType,
  ChartTimePeriod,
  ComparisonSeries
} from './charting.models';

export function buildChartDataParams(request: ChartDataRequest): HttpParams {
  let params = new HttpParams()
    .set('timePeriod', request.timePeriod)
    .set('instrumentType', request.instrument.type);

  if (request.fromDate) {
    params = params.set('fromDate', request.fromDate);
  }

  if (request.toDate) {
    params = params.set('toDate', request.toDate);
  }

  return params;
}

export function buildComparisonParams(request: ChartComparisonDataRequest): HttpParams {
  let params = new HttpParams()
    .set('baseMarket', request.baseInstrument.market)
    .set('baseInstrumentId', request.baseInstrument.id)
    .set('timePeriod', request.timePeriod);

  for (const instrument of request.comparisonInstruments) {
    params = params.append('comparison', `${instrument.type}:${instrument.market}:${instrument.id}`);
  }

  if (request.fromDate) {
    params = params.set('fromDate', request.fromDate);
  }

  if (request.toDate) {
    params = params.set('toDate', request.toDate);
  }

  return params;
}

export function mapChartDataResponse(response: unknown): ChartPoint[] {
  return mapArray(response)
    .map(mapChartPoint)
    .filter((point): point is ChartPoint => point !== null)
    .sort((left, right) => Date.parse(left.time) - Date.parse(right.time));
}

export function mapComparisonChartDataResponse(
  response: unknown,
  instruments: readonly ChartInstrument[]
): ComparisonSeries[] {
  const record = toRecord(response);

  if (!record) {
    return [];
  }

  const rawSeries = mapArray(record['series'] ?? record['items'] ?? record['data']);

  return rawSeries
    .map((value) => mapComparisonSeries(value, instruments))
    .filter((series): series is ComparisonSeries => series !== null);
}

export function mapTickToChartPoint(payload: unknown, previous?: ChartPoint): ChartPoint | null {
  const record = toRecord(payload);

  if (!record) {
    return null;
  }

  const close = toNumber(
    record['close'] ??
      record['lastPrice'] ??
      record['last_price'] ??
      record['last'] ??
      record['price'] ??
      record['tradePrice'] ??
      record['trade_price']
  );

  if (close === undefined) {
    return null;
  }

  const open = toNumber(record['open'] ?? record['openPrice'] ?? record['open_price']) ?? previous?.open ?? close;
  const high = toNumber(record['high'] ?? record['highPrice'] ?? record['high_price']) ?? Math.max(previous?.high ?? close, close);
  const low = toNumber(record['low'] ?? record['lowPrice'] ?? record['low_price']) ?? Math.min(previous?.low ?? close, close);

  return {
    time: resolveTime(record['time'] ?? record['timestamp'] ?? record['lastTradeTime'] ?? record['last_trade_time']),
    open,
    high,
    low,
    close,
    lastPrice: close,
    volume: toNumber(record['volume'] ?? record['totalVolume'] ?? record['total_volume'] ?? record['tradeVolume'])
  };
}

export function getReferenceChartInstruments(symbols: readonly SharedSymbolOption[] = []): ChartInstrument[] {
  const symbolInstruments = symbols.map<ChartInstrument>((symbol) => ({
    id: symbol.symbolId,
    name: symbol.symbolName,
    type: 'SYMBOL',
    market: symbol.market,
    currency: symbol.currency
  }));

  const indexInstruments: ChartInstrument[] = [
    { id: 'FADX15', name: 'FADX 15', type: 'INDEX', market: 'ADX', currency: 'AED' },
    { id: 'DFMGI', name: 'DFM General Index', type: 'INDEX', market: 'DFM', currency: 'AED' },
    { id: 'TASI', name: 'Tadawul All Share Index', type: 'INDEX', market: 'TADAWUL', currency: 'SAR' }
  ];

  return [...indexInstruments, ...symbolInstruments];
}

export function filterChartInstruments(query: string, instruments: readonly ChartInstrument[]): ChartInstrument[] {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return instruments.slice(0, 18);
  }

  return instruments
    .filter((instrument) =>
      `${instrument.id} ${instrument.name} ${instrument.market} ${instrument.type}`.toLowerCase().includes(normalized)
    )
    .slice(0, 18);
}

export function displayChartInstrument(value: string | ChartInstrument | null): string {
  if (!value) {
    return '';
  }

  return typeof value === 'string'
    ? value
    : `${value.id} - ${value.name} (${value.market} ${value.type.toLowerCase()})`;
}

export function normalizeChartType(value: ChartRenderType): 'line' | 'area' | 'bar' | 'candlestick' {
  switch (value) {
    case 'AREA':
      return 'area';
    case 'BAR':
      return 'bar';
    case 'CANDLESTICK':
      return 'candlestick';
    default:
      return 'line';
  }
}

export function mapTimePeriodToShared(value: ChartTimePeriod): '1D' | '1W' | '1M' | '3M' | '1Y' {
  switch (value) {
    case '1W':
      return '1W';
    case '1M':
      return '1M';
    case '3M':
    case '6M':
      return '3M';
    case '1Y':
      return '1Y';
    default:
      return '1D';
  }
}

function mapComparisonSeries(value: unknown, instruments: readonly ChartInstrument[]): ComparisonSeries | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const instrumentId = toString(record['instrumentId'] ?? record['symbolId'] ?? record['indexId'] ?? record['id']);
  const market = toString(record['market'] ?? record['exchange']);
  const instrument =
    instruments.find((item) => item.id === instrumentId && (!market || item.market === market)) ??
    (instrumentId && market
      ? {
          id: instrumentId,
          name: toString(record['name'] ?? record['instrumentName'] ?? record['symbolName']) ?? instrumentId,
          type: (toString(record['type'])?.toUpperCase() === 'INDEX' ? 'INDEX' : 'SYMBOL') as ChartInstrument['type'],
          market
        }
      : null);

  return instrument
    ? {
        instrument,
        data: mapChartDataResponse(record['points'] ?? record['data'] ?? []),
        color: toString(record['color'])
      }
    : null;
}

function mapChartPoint(value: unknown): ChartPoint | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const close = toNumber(record['close'] ?? record['lastPrice'] ?? record['last_price'] ?? record['value']);

  if (close === undefined) {
    return null;
  }

  return {
    time: resolveTime(record['time'] ?? record['date'] ?? record['timestamp']),
    open: toNumber(record['open']) ?? close,
    high: toNumber(record['high']) ?? close,
    low: toNumber(record['low']) ?? close,
    close,
    lastPrice: toNumber(record['lastPrice'] ?? record['last_price']) ?? close,
    volume: toNumber(record['volume'] ?? record['totalVolume'] ?? record['total_volume'])
  };
}

function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const record = toRecord(response);

  if (!record) {
    return [];
  }

  for (const key of ['items', 'data', 'rows', 'points', 'series', 'history']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function resolveTime(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value.trim();
  }

  return new Date().toISOString();
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? `${value}`
      : undefined;
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

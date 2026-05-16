import { HttpParams } from '@angular/common/http';

import { getDirectionClass, resolveDirection } from '../utils/direction.util';
import {
  NewsAnnouncementRow,
  NewsAnnouncementsFilters,
  SymbolOption
} from './news-announcements.models';

type UnknownRecord = Record<string, unknown>;

export function buildNewsAnnouncementsParams(filters: NewsAnnouncementsFilters): HttpParams {
  let params = new HttpParams()
    .set('showProductNews', String(filters.showProductNews))
    .set('showBrokerNews', String(filters.showBrokerNews))
    .set('showMarketNews', String(filters.showMarketNews))
    .set('market', filters.market)
    .set('fromDate', filters.fromDate)
    .set('toDate', filters.toDate);

  if (filters.symbol?.symbolId) {
    params = params.set('symbolId', filters.symbol.symbolId);
  }

  return params;
}

export function mapNewsAnnouncementsResponse(response: unknown): NewsAnnouncementRow[] {
  const entries = unwrapEntries(response);

  return entries
    .map((entry, index) => mapNewsAnnouncementRecord(entry, index))
    .filter((row): row is NewsAnnouncementRow => row !== null);
}

export function validateNewsAnnouncementsFilters(filters: NewsAnnouncementsFilters): string | undefined {
  if (!filters.fromDate) {
    return 'From Date is required.';
  }

  if (!filters.toDate) {
    return 'To Date is required.';
  }

  if (Date.parse(filters.fromDate) > Date.parse(filters.toDate)) {
    return 'From Date cannot be after To Date.';
  }

  if (!filters.showProductNews && !filters.showBrokerNews && !filters.showMarketNews) {
    return 'Select at least one news category.';
  }

  return undefined;
}

export function directionClass(row: NewsAnnouncementRow): string {
  return row.direction ? getDirectionClass(row.direction) : '';
}

export function hasSymbol(row: NewsAnnouncementRow): boolean {
  return typeof row.symbolId === 'string' && row.symbolId.trim().length > 0;
}

export function normalizeSelectedSymbol(
  value: string | SymbolOption | null | undefined
): SymbolOption | null {
  return value && typeof value === 'object' ? value : null;
}

function unwrapEntries(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;
    const candidates = [record['items'], record['data'], record['results'], record['news']];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) {
        return candidate;
      }
    }
  }

  return [];
}

function mapNewsAnnouncementRecord(entry: unknown, index: number): NewsAnnouncementRow | null {
  const record = toRecord(entry);

  if (!record) {
    return null;
  }

  const description =
    toString(record['description'] ?? record['headline'] ?? record['title'] ?? record['summary']) ??
    'Untitled news item';
  const symbolId = toString(record['symbolId'] ?? record['symbol_id'] ?? record['symbol']);
  const change = toNumber(record['change']);
  const newsType = mapNewsType(record['newsType'] ?? record['type'] ?? record['category']);
  const dateTimeValue =
    record['dateTime'] ??
    record['datetime'] ??
    record['publishedAt'] ??
    record['published_at'] ??
    record['timestamp'];
  const { date, time } = formatDateTime(
    dateTimeValue,
    toString(record['date']),
    toString(record['time'])
  );

  return {
    id:
      toString(record['id']) ??
      `${symbolId ?? newsType}-${date}-${time}-${index}`,
    symbolId,
    symbolName: toString(record['symbolName'] ?? record['symbol_name'] ?? record['name']),
    marketName: toString(record['marketName'] ?? record['market_name']),
    marketShortName: toString(record['marketShortName'] ?? record['market_short_name'] ?? record['market']),
    description,
    date,
    time,
    url: toString(record['url'] ?? record['link']),
    direction: mapDirection(record['direction'], change),
    newsType
  };
}

function formatDateTime(
  dateTimeValue: unknown,
  fallbackDate?: string,
  fallbackTime?: string
): { date: string; time: string } {
  const parsed = parseDateValue(dateTimeValue);

  if (parsed) {
    return {
      date: formatDate(parsed),
      time: formatTime(parsed)
    };
  }

  return {
    date: fallbackDate && fallbackDate.trim() ? fallbackDate : '--/--/----',
    time: fallbackTime && fallbackTime.trim() ? fallbackTime : '--:--:--'
  };
}

function parseDateValue(value: unknown): Date | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function formatDate(value: Date): string {
  const day = `${value.getDate()}`.padStart(2, '0');
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatTime(value: Date): string {
  const hours = `${value.getHours()}`.padStart(2, '0');
  const minutes = `${value.getMinutes()}`.padStart(2, '0');
  const seconds = `${value.getSeconds()}`.padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function mapNewsType(value: unknown): NewsAnnouncementRow['newsType'] {
  const normalized = toString(value)?.toUpperCase();

  switch (normalized) {
    case 'PRODUCT':
    case 'BROKER':
    case 'MARKET':
      return normalized;
    default:
      return 'MARKET';
  }
}

function mapDirection(value: unknown, change?: number): NewsAnnouncementRow['direction'] | undefined {
  const normalized = toString(value)?.toUpperCase();

  if (normalized === 'UP' || normalized === 'DOWN' || normalized === 'UNCHANGED') {
    return normalized;
  }

  if (typeof change === 'number' && Number.isFinite(change)) {
    return resolveDirection(change);
  }

  return undefined;
}

function toRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' ? (value as UnknownRecord) : null;
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
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

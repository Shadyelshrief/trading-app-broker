import { HttpParams } from '@angular/common/http';

import { getDirectionClass, resolveDirection } from '../utils/direction.util';
import {
  HistoricalTopSymbolRow,
  HistoricalTopSymbolsDirection,
  HistoricalTopSymbolsFilters,
  HistoricalTopSymbolsViewKey
} from './historical-top-symbols.models';

type UnknownRecord = Record<string, unknown>;

export function buildHistoricalTopSymbolsParams(filters: HistoricalTopSymbolsFilters): HttpParams {
  return new HttpParams()
    .set('market', filters.market)
    .set('selectedView', filters.selectedView)
    .set('numberOfSymbols', String(filters.numberOfSymbols))
    .set('fromDate', filters.fromDate)
    .set('toDate', filters.toDate);
}

export function mapHistoricalTopSymbolsResponse(payload: unknown): HistoricalTopSymbolRow[] {
  if (Array.isArray(payload)) {
    return payload.map(mapHistoricalTopSymbolRow).filter((row): row is HistoricalTopSymbolRow => row !== null);
  }

  const record = toRecord(payload);

  if (!record) {
    return [];
  }

  const nested =
    (Array.isArray(record['items']) ? record['items'] : null) ??
    (Array.isArray(record['rows']) ? record['rows'] : null) ??
    (Array.isArray(record['results']) ? record['results'] : null) ??
    (Array.isArray(record['symbols']) ? record['symbols'] : null);

  if (!nested) {
    return [];
  }

  return nested.map(mapHistoricalTopSymbolRow).filter((row): row is HistoricalTopSymbolRow => row !== null);
}

export function sortHistoricalTopSymbols(
  rows: readonly HistoricalTopSymbolRow[],
  selectedView: HistoricalTopSymbolsViewKey,
  limit: number
): HistoricalTopSymbolRow[] {
  const sorted = [...rows].sort((left, right) => {
    switch (selectedView) {
      case 'MOST_ACTIVE_VOLUME':
        return right.totalVolume - left.totalVolume;
      case 'MOST_ACTIVE_VALUE':
        return right.turnover - left.turnover;
      case 'TOP_GAINERS_PERCENT':
        return right.changePercent - left.changePercent;
      case 'TOP_GAINERS_CHANGE':
        return right.change - left.change;
      case 'TOP_LOSERS_PERCENT':
        return left.changePercent - right.changePercent;
      case 'TOP_LOSERS_CHANGE':
        return left.change - right.change;
      default:
        return 0;
    }
  });

  return sorted.slice(0, Math.max(1, limit));
}

export function validateHistoricalTopSymbolsFilters(
  filters: HistoricalTopSymbolsFilters
): string | undefined {
  if (!filters.market) {
    return 'Please select a market.';
  }

  if (!filters.selectedView) {
    return 'Please select a ranking view.';
  }

  if (!filters.fromDate) {
    return 'From Date is required.';
  }

  if (!filters.toDate) {
    return 'To Date is required.';
  }

  if (filters.numberOfSymbols <= 0) {
    return 'Number of Symbols must be greater than zero.';
  }

  const from = Date.parse(filters.fromDate);
  const to = Date.parse(filters.toDate);

  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    return 'Please select valid dates.';
  }

  if (from > to) {
    return 'From Date cannot be after To Date.';
  }

  return undefined;
}

export function directionClass(direction: HistoricalTopSymbolsDirection): string {
  return getDirectionClass(direction);
}

export function directionGlyph(direction: HistoricalTopSymbolsDirection): string {
  switch (direction) {
    case 'UP':
      return '&#8593;';
    case 'DOWN':
      return '&#8595;';
    default:
      return '&#8722;';
  }
}

function mapHistoricalTopSymbolRow(value: unknown): HistoricalTopSymbolRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const change = toNumber(record['change'] ?? record['netChange'] ?? record['net_change']) ?? 0;
  const changePercent =
    toNumber(record['changePercent'] ?? record['change_percent'] ?? record['netChangePercent']) ?? 0;
  const direction = resolveHistoricalDirection(record, change);

  return {
    marketName: toString(record['marketName'] ?? record['market_name']) ?? '',
    marketShortName: toString(record['marketShortName'] ?? record['market_short_name']) ?? '',
    symbolName: toString(record['symbolName'] ?? record['symbol_name'] ?? record['name']) ?? '',
    symbolShortName:
      toString(record['symbolShortName'] ?? record['symbol_short_name'] ?? record['shortName']) ?? '',
    symbolId: toString(record['symbolId'] ?? record['symbol_id'] ?? record['id'] ?? record['symbol']) ?? '',
    lastPrice:
      toNumber(record['lastPrice'] ?? record['last_price'] ?? record['price']) ?? 0,
    changePercent,
    changeDirection: direction,
    totalVolume:
      toNumber(record['totalVolume'] ?? record['total_volume'] ?? record['volume']) ?? 0,
    turnover:
      toNumber(record['turnover'] ?? record['totalValue'] ?? record['total_value'] ?? record['value']) ?? 0,
    change,
    currency: toString(record['currency'] ?? record['ccy']) ?? ''
  };
}

function resolveHistoricalDirection(record: UnknownRecord, change: number): HistoricalTopSymbolsDirection {
  const raw = toString(record['changeDirection'] ?? record['change_direction'] ?? record['direction']);

  if (raw) {
    const normalized = raw.toUpperCase();

    if (normalized === 'UP' || normalized === 'RISING' || normalized === 'PLUS') {
      return 'UP';
    }

    if (normalized === 'DOWN' || normalized === 'FALLING' || normalized === 'MINUS') {
      return 'DOWN';
    }
  }

  return resolveDirection(change);
}

function toRecord(payload: unknown): UnknownRecord | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }

  return payload as UnknownRecord;
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
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

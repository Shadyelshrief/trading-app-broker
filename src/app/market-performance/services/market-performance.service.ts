import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ReferenceDataLookupsService } from '../../shared/lookups/reference-data-lookups.service';
import { mapAssetsToSharedSymbolOptions } from '../../shared/utils/symbol-reference.util';
import type { TechnicalIndicatorConfig, TechnicalIndicatorSeries } from '../technical-indicators/indicator.models';

export type PerformanceDirection = 'UP' | 'DOWN' | 'UNCHANGED';
export type PerformancePeriod = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'CUSTOM';

export interface IndexOption {
  indexId: string;
  indexName: string;
  market: string;
}

export interface SecurityOption {
  symbolId: string;
  symbolName: string;
  market: string;
  currency: string;
}

export interface PerformanceRequest {
  itemId: string;
  period: PerformancePeriod;
  fromDate?: string;
  toDate?: string;
}

export interface TechnicalIndicatorRequest extends PerformanceRequest {
  indicators: TechnicalIndicatorConfig[];
}

export interface ComparisonPerformanceRequest extends PerformanceRequest {
  comparisonIds: string[];
  itemType: 'INDEX' | 'SECURITY';
}

export interface IndexPerformanceRow {
  tradingDate: string;
  closingIndex: number;
  openIndex: number;
  change: number;
  changePercent: number;
  changeDirection: PerformanceDirection;
  highPrice: number;
  lowPrice: number;
  volume?: number;
}

export interface SecurityPerformanceRow {
  tradingDate: string;
  closingPrice: number;
  openPrice: number;
  change: number;
  changePercent: number;
  changeDirection: PerformanceDirection;
  currency: string;
  highPrice: number;
  lowPrice: number;
  trades: number;
  volumeTraded: number;
}

export interface ChartSeriesPoint {
  date: string;
  time?: string;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
  volume?: number;
}

export interface ComparisonSeries {
  id: string;
  label: string;
  points: ChartSeriesPoint[];
}

@Injectable({ providedIn: 'root' })
export class MarketPerformanceService {
  private readonly http = inject(HttpClient);
  private readonly reference = inject(ReferenceDataLookupsService);
  private readonly base = `${environment.apiUrl}/market-performance`;

  getIndexOptions(query: string): Observable<IndexOption[]> {
    return this.http
      .get<unknown>(`${this.base}/indices`, { params: new HttpParams().set('query', query) })
      .pipe(map((response) => mapArray(response).map(mapIndexOption).filter((item): item is IndexOption => item !== null)));
  }

  getSecurityOptions(query: string): Observable<SecurityOption[]> {
    return this.reference.searchAssets(query).pipe(
      map((assets) =>
        mapAssetsToSharedSymbolOptions(assets)
          .map((symbol) => ({
            symbolId: symbol.symbolId,
            symbolName: symbol.symbolName,
            market: symbol.market,
            currency: symbol.currency
          }))
      )
    );
  }

  getIndexPerformance(request: PerformanceRequest): Observable<IndexPerformanceRow[]> {
    return this.http
      .get<unknown>(`${this.base}/indices/${encodeURIComponent(request.itemId)}/performance`, {
        params: buildPerformanceParams(request)
      })
      .pipe(map((response) => mapArray(response).map(mapIndexPerformanceRow).filter((row): row is IndexPerformanceRow => row !== null)));
  }

  getSecurityPerformance(request: PerformanceRequest): Observable<SecurityPerformanceRow[]> {
    return this.http
      .get<unknown>(`${this.base}/securities/${encodeURIComponent(request.itemId)}/performance`, {
        params: buildPerformanceParams(request)
      })
      .pipe(map((response) => mapArray(response).map(mapSecurityPerformanceRow).filter((row): row is SecurityPerformanceRow => row !== null)));
  }

  getTechnicalIndicatorData(request: TechnicalIndicatorRequest): Observable<TechnicalIndicatorSeries[]> {
    return this.http.post<TechnicalIndicatorSeries[]>(`${this.base}/technical-indicators`, request);
  }

  getComparisonPerformance(request: ComparisonPerformanceRequest): Observable<ComparisonSeries[]> {
    return this.http.post<ComparisonSeries[]>(`${this.base}/comparison`, request);
  }
}

function buildPerformanceParams(request: PerformanceRequest): HttpParams {
  let params = new HttpParams().set('period', request.period);

  if (request.fromDate) {
    params = params.set('fromDate', request.fromDate);
  }

  if (request.toDate) {
    params = params.set('toDate', request.toDate);
  }

  return params;
}

function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  if (response && typeof response === 'object') {
    const record = response as Record<string, unknown>;

    for (const key of ['items', 'data', 'rows', 'results']) {
      if (Array.isArray(record[key])) {
        return record[key] as unknown[];
      }
    }
  }

  return [];
}

function mapIndexOption(value: unknown): IndexOption | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const indexId = toString(record['indexId'] ?? record['id'] ?? record['code']);

  return indexId
    ? {
        indexId,
        indexName: toString(record['indexName'] ?? record['name'] ?? record['label']) ?? indexId,
        market: toString(record['market'] ?? record['exchange']) ?? ''
      }
    : null;
}

function mapIndexPerformanceRow(value: unknown): IndexPerformanceRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const tradingDate = toString(record['tradingDate'] ?? record['date']);

  if (!tradingDate) {
    return null;
  }

  const change = toNumber(record['change']) ?? 0;

  return {
    tradingDate,
    closingIndex: toNumber(record['closingIndex'] ?? record['close'] ?? record['value']) ?? 0,
    openIndex: toNumber(record['openIndex'] ?? record['open']) ?? 0,
    change,
    changePercent: toNumber(record['changePercent'] ?? record['change_percent']) ?? 0,
    changeDirection: mapDirection(record['changeDirection'] ?? record['direction'], change),
    highPrice: toNumber(record['highPrice'] ?? record['high']) ?? 0,
    lowPrice: toNumber(record['lowPrice'] ?? record['low']) ?? 0,
    volume: toNumber(record['volume'])
  };
}

function mapSecurityPerformanceRow(value: unknown): SecurityPerformanceRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const tradingDate = toString(record['tradingDate'] ?? record['date']);

  if (!tradingDate) {
    return null;
  }

  const change = toNumber(record['change']) ?? 0;

  return {
    tradingDate,
    closingPrice: toNumber(record['closingPrice'] ?? record['close'] ?? record['lastPrice']) ?? 0,
    openPrice: toNumber(record['openPrice'] ?? record['open']) ?? 0,
    change,
    changePercent: toNumber(record['changePercent'] ?? record['change_percent']) ?? 0,
    changeDirection: mapDirection(record['changeDirection'] ?? record['direction'], change),
    currency: toString(record['currency']) ?? '',
    highPrice: toNumber(record['highPrice'] ?? record['high']) ?? 0,
    lowPrice: toNumber(record['lowPrice'] ?? record['low']) ?? 0,
    trades: toNumber(record['trades'] ?? record['numberOfTrades']) ?? 0,
    volumeTraded: toNumber(record['volumeTraded'] ?? record['volume']) ?? 0
  };
}

function mapDirection(value: unknown, change: number): PerformanceDirection {
  const normalized = toString(value)?.toUpperCase();

  if (normalized === 'UP' || normalized === 'DOWN' || normalized === 'UNCHANGED') {
    return normalized;
  }

  if (change > 0) {
    return 'UP';
  }

  if (change < 0) {
    return 'DOWN';
  }

  return 'UNCHANGED';
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

import { HttpParams } from '@angular/common/http';

import type { ClientSearchFilters, ClientSearchResult } from './client-search.models';

export function buildClientSearchParams(filters: ClientSearchFilters): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && `${value}`.trim()) {
      params = params.set(key, `${value}`);
    }
  }

  return params;
}

export function mapClientSearchResponse(response: unknown): ClientSearchResult[] {
  return mapArray(response).map(mapClientSearchResult).filter((row): row is ClientSearchResult => row !== null);
}

export function mapClientSearchResult(value: unknown): ClientSearchResult | null {
  const record = toRecord(value);
  const clientId = toString(record?.['clientId'] ?? record?.['id'] ?? record?.['code']);

  return clientId
    ? {
        clientId,
        clientName:
          toString(record?.['clientName'] ?? record?.['name'] ?? record?.['label'] ?? record?.['fullName'] ?? record?.['username'] ?? record?.['friendlyId']) ??
          clientId
      }
    : null;
}

export function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const record = toRecord(response);

  if (!record) {
    return [];
  }

  for (const key of ['body', 'items', 'data', 'rows', 'results', 'clients', 'portfolios', 'accounts', 'deliveryChannels']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

export function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? `${value}`
      : undefined;
}

export function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

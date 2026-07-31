import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface BrokerClientOption {
  clientId: string;
  clientName: string;
  friendlyId?: string;
  username?: string;
  fullName?: string;
}

export interface BrokerPortfolioOption {
  portfolioId: string;
  portfolioName: string;
  currency: string;
  type?: string;
}

export interface BrokerWalletOption {
  walletId: string;
  walletName: string;
  currency: string;
  type?: string;
}

@Injectable({ providedIn: 'root' })
export class BrokerLookupsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;

  searchClients(query: string): Observable<BrokerClientOption[]> {
    const q = query.trim();

    if (!q) {
      return of([]);
    }

    return this.http
      .get<unknown>(`${this.base}/clients/search`, { params: new HttpParams().set('q', q) })
      .pipe(map(mapBrokerClientsResponse));
  }

  getClientPortfolios(clientId: string): Observable<BrokerPortfolioOption[]> {
    return this.http
      .get<unknown>(`${this.base}/clients/${encodeURIComponent(clientId)}/portfolios`)
      .pipe(map(mapBrokerPortfoliosResponse));
  }

  getPortfolioWallets(portfolioId: string): Observable<BrokerWalletOption[]> {
    return this.http
      .get<unknown>(`${this.base}/portfolios/${encodeURIComponent(portfolioId)}/wallets`)
      .pipe(map(mapBrokerWalletsResponse));
  }
}

export function mapBrokerClientsResponse(response: unknown): BrokerClientOption[] {
  return mapArray(response).map(mapClient).filter((client): client is BrokerClientOption => client !== null);
}

export function mapBrokerPortfoliosResponse(response: unknown): BrokerPortfolioOption[] {
  return mapArray(response).map(mapPortfolio).filter((portfolio): portfolio is BrokerPortfolioOption => portfolio !== null);
}

export function mapBrokerWalletsResponse(response: unknown): BrokerWalletOption[] {
  return mapArray(response).map(mapWallet).filter((wallet): wallet is BrokerWalletOption => wallet !== null);
}

function mapClient(value: unknown): BrokerClientOption | null {
  const record = toRecord(value);
  const clientId = toString(record?.['clientId'] ?? record?.['id'] ?? record?.['code']);

  if (!clientId) {
    return null;
  }

  const friendlyId = toString(record?.['friendlyId'] ?? record?.['friendly_id']);
  const username = toString(record?.['username']);
  const fullName = toString(record?.['fullName'] ?? record?.['full_name']);
  const clientName = toString(record?.['clientName'] ?? record?.['name'] ?? record?.['label']) ?? fullName ?? username ?? friendlyId ?? clientId;

  return {
    clientId,
    clientName,
    friendlyId,
    username,
    fullName
  };
}

function mapPortfolio(value: unknown): BrokerPortfolioOption | null {
  const record = toRecord(value);
  const portfolioId = toString(record?.['portfolioId'] ?? record?.['id'] ?? record?.['code']);

  return portfolioId
    ? {
        portfolioId,
        portfolioName: toString(record?.['portfolioName'] ?? record?.['name'] ?? record?.['label']) ?? portfolioId,
        currency: toString(record?.['currency']) ?? '',
        type: toString(record?.['type'])
      }
    : null;
}

function mapWallet(value: unknown): BrokerWalletOption | null {
  const record = toRecord(value);
  const walletId = toString(record?.['walletId'] ?? record?.['id'] ?? record?.['code']);

  return walletId
    ? {
        walletId,
        walletName: toString(record?.['walletName'] ?? record?.['name'] ?? record?.['label']) ?? walletId,
        currency: toString(record?.['currency']) ?? '',
        type: toString(record?.['type'])
      }
    : null;
}

function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const record = toRecord(response);

  if (!record) {
    return [];
  }

  for (const key of ['body', 'items', 'data', 'rows', 'results', 'clients', 'portfolios', 'wallets']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
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

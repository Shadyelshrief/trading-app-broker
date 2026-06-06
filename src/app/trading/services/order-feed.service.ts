import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, merge } from 'rxjs';

import { AuthService } from '../../core/auth/auth.service';
import { MarketDataService } from '../../core/market-data';
import type { OrderFeedConfig } from './order.models';

const ORDER_CLIENTS_STORAGE_KEY = 'broker_order_client_ids';
const ORDER_PORTFOLIOS_STORAGE_KEY = 'broker_order_portfolio_ids';
const ORDER_BROKERS_STORAGE_KEY = 'broker_order_broker_ids';
const ORDER_TOPICS_STORAGE_KEY = 'broker_order_topics';

@Injectable({ providedIn: 'root' })
export class OrderFeedService {
  private readonly marketData = inject(MarketDataService);
  private readonly auth = inject(AuthService);

  observeOrders(): Observable<unknown> {
    const config = this.resolveFeedConfig();

    if (config.topics.length === 0) {
      return EMPTY;
    }

    return merge(...config.topics.map((topic) => this.marketData.observe<unknown>(topic)));
  }

  resolveFeedConfig(): OrderFeedConfig {
    const claims = this.readTokenClaims();
    const explicitTopics = this.readStringList(ORDER_TOPICS_STORAGE_KEY);
    const clientIds = unique([...readClaimList(claims, ['client_ids', 'clientIds', 'clients']), ...this.readStringList(ORDER_CLIENTS_STORAGE_KEY)]);
    const portfolioIds = unique([...readClaimList(claims, ['portfolio_ids', 'portfolioIds', 'portfolios']), ...this.readStringList(ORDER_PORTFOLIOS_STORAGE_KEY)]);
    const brokerIds = unique([...readClaimList(claims, ['broker_ids', 'brokerIds', 'brokers']), ...this.readStringList(ORDER_BROKERS_STORAGE_KEY)]);
    const topics = unique([
      ...explicitTopics,
      ...clientIds.map((clientId) => `orders:client:${clientId}`),
      ...portfolioIds.map((portfolioId) => `orders:portfolio:${portfolioId}`),
      ...brokerIds.map((brokerId) => `orders:broker:${brokerId}`)
    ]);

    return { topics, clientIds, portfolioIds, brokerIds };
  }

  private readTokenClaims(): Record<string, unknown> | null {
    const token = this.auth.getBearerToken();

    if (!token || !token.includes('.')) {
      return null;
    }

    try {
      const [, payload] = token.split('.');
      const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      return JSON.parse(atob(paddedPayload)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readStringList(key: string): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const raw = window.localStorage.getItem(key);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return raw.split(',').map((item) => item.trim()).filter(Boolean);
    }

    return raw.split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function readClaimList(claims: Record<string, unknown> | null, keys: readonly string[]): string[] {
  if (!claims) {
    return [];
  }

  for (const key of keys) {
    const value = claims[key];
    if (Array.isArray(value)) {
      return value.map((item) => `${item}`).filter(Boolean);
    }
    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function unique(values: readonly string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

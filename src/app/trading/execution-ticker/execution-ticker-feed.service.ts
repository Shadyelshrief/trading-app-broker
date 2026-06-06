import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, merge, of } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';

import { AuthService } from '../../core/auth/auth.service';
import { MarketDataService } from '../../core/market-data';
import { ExecutionTickerFeedConfig, ExecutionTickerRow } from './execution-ticker.models';
import { mapExecutionPayloadToRows } from './execution-ticker.mapper';

const EXECUTION_CLIENTS_STORAGE_KEY = 'broker_execution_client_ids';
const EXECUTION_TOPICS_STORAGE_KEY = 'broker_execution_topics';

@Injectable({ providedIn: 'root' })
export class ExecutionTickerFeedService {
  private readonly marketData = inject(MarketDataService);
  private readonly auth = inject(AuthService);

  getExecutionsSinceLogin(): Observable<ExecutionTickerRow[]> {
    return of([]);
  }

  observeExecutions(): Observable<ExecutionTickerRow> {
    const config = this.resolveFeedConfig();

    if (config.topics.length === 0) {
      return EMPTY;
    }

    return merge(
      ...config.topics.map((topic) =>
        this.marketData.observe<unknown>(topic).pipe(
          map((payload) => mapExecutionPayloadToRows(payload, topic)),
          map((rows) => rows.filter((row) => config.clientIds.length === 0 || config.clientIds.includes(row.clientId))),
          mergeMap((rows) => rows.slice(0, 25))
        )
      )
    );
  }

  resolveFeedConfig(): ExecutionTickerFeedConfig {
    const tokenClaims = this.readTokenClaims();
    const explicitTopics = this.readStringList(EXECUTION_TOPICS_STORAGE_KEY);
    const topicClaims = readClaimList(tokenClaims, ['execution_topics', 'executionTopics', 'order_topics', 'orderTopics']);
    const clientClaims = readClaimList(tokenClaims, ['client_ids', 'clientIds', 'clients', 'allowedClients']);
    const storedClients = this.readStringList(EXECUTION_CLIENTS_STORAGE_KEY);
    const singleClient = readClaimString(tokenClaims, ['client_id', 'clientId', 'sub']);
    const clientIds = [...clientClaims, ...storedClients, ...(singleClient ? [singleClient] : [])]
      .map((clientId) => clientId.trim())
      .filter(Boolean);
    const uniqueClientIds = Array.from(new Set(clientIds));
    const topics = [...explicitTopics, ...topicClaims, ...uniqueClientIds.map((clientId) => `orders:client:${clientId}`)]
      .map((topic) => topic.trim())
      .filter(Boolean);

    return {
      topics: Array.from(new Set(topics)),
      clientIds: uniqueClientIds
    };
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
      const decoded = atob(paddedPayload);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readStringList(key: string): string[] {
    if (typeof window === 'undefined') {
      return [];
    }

    const value = window.localStorage.getItem(key);

    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value) as unknown;

      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      return value.split(',');
    }

    return value.split(',');
  }
}

function readClaimList(claims: Record<string, unknown> | null, keys: readonly string[]): string[] {
  if (!claims) {
    return [];
  }

  for (const key of keys) {
    const value = claims[key];

    if (Array.isArray(value)) {
      return value
        .map((item) => (typeof item === 'string' || typeof item === 'number' ? `${item}` : ''))
        .filter(Boolean);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.split(',').map((item) => item.trim()).filter(Boolean);
    }
  }

  return [];
}

function readClaimString(claims: Record<string, unknown> | null, keys: readonly string[]): string | null {
  if (!claims) {
    return null;
  }

  for (const key of keys) {
    const value = claims[key];

    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
      return `${value}`;
    }
  }

  return null;
}

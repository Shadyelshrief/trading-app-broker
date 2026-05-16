import { Injectable } from '@angular/core';

import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ReconnectStrategyService {
  private readonly config = environment.marketData.reconnect;

  nextWebSocketDelay(attempt: number): number {
    return this.backoff(attempt, this.config.initialDelayMs, this.config.maxDelayMs);
  }

  nextAuthDelay(attempt: number): number {
    return this.backoff(attempt, this.config.authInitialDelayMs, this.config.authMaxDelayMs);
  }

  private backoff(attempt: number, initialDelayMs: number, maxDelayMs: number): number {
    const safeAttempt = Math.max(0, attempt - 1);
    const exponentialDelay = Math.min(initialDelayMs * 2 ** safeAttempt, maxDelayMs);
    const jitter = Math.round(exponentialDelay * 0.15 * Math.random());

    return exponentialDelay + jitter;
  }
}

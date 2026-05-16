import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subscription,
  catchError,
  delayWhen,
  distinctUntilChanged,
  finalize,
  map,
  of,
  retryWhen,
  scan,
  shareReplay,
  switchMap,
  tap,
  throwError,
  timer
} from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ReconnectStrategyService } from './reconnect-strategy.service';

interface MarketAuthLoginRequest {
  username: string;
  password: string;
}

interface MarketAuthLoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

interface MarketAuthRefreshRequest {
  refresh_token: string;
}

interface MarketAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

@Injectable({ providedIn: 'root' })
export class MarketAuthService {
  private readonly http = inject(HttpClient);
  private readonly reconnectStrategy = inject(ReconnectStrategyService);

  private readonly authBaseUrl = environment.marketData.authHttpUrl;
  private readonly sessionState = new BehaviorSubject<MarketAuthSession | null>(null);
  private refreshTimerSubscription?: Subscription;
  private loginInFlight$?: Observable<MarketAuthSession>;
  private refreshInFlight$?: Observable<MarketAuthSession>;

  readonly session$ = this.sessionState.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly accessToken$ = this.session$.pipe(
    map((session) => session?.accessToken ?? null),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  ensureAuthenticated(): Observable<MarketAuthSession> {
    const activeSession = this.sessionState.value;

    if (activeSession && !this.isRefreshWindow(activeSession)) {
      return of(activeSession);
    }

    if (activeSession?.refreshToken) {
      return this.refreshAccessToken();
    }

    return this.login();
  }

  refreshAccessToken(): Observable<MarketAuthSession> {
    const current = this.sessionState.value;

    if (!current?.refreshToken) {
      return this.login();
    }

    if (this.refreshInFlight$) {
      return this.refreshInFlight$;
    }

    this.refreshInFlight$ = this.http
      .post<MarketAuthLoginResponse>(`${this.authBaseUrl}/refresh`, {
        refresh_token: current.refreshToken
      } satisfies MarketAuthRefreshRequest)
      .pipe(
        this.retryTransientAuthFailures('refresh'),
        map((response) => this.toSession(response)),
        tap((session) => this.persistSession(session)),
        catchError((error) => this.handleRefreshFailure(error)),
        finalize(() => {
          this.refreshInFlight$ = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.refreshInFlight$;
  }

  getAccessTokenSnapshot(): string | null {
    return this.sessionState.value?.accessToken ?? null;
  }

  clearSession(): void {
    this.refreshTimerSubscription?.unsubscribe();
    this.refreshTimerSubscription = undefined;
    this.sessionState.next(null);
  }

  private login(): Observable<MarketAuthSession> {
    if (this.loginInFlight$) {
      return this.loginInFlight$;
    }

    this.loginInFlight$ = this.http
      .post<MarketAuthLoginResponse>(
        `${this.authBaseUrl}/login`,
        environment.marketData.credentials satisfies MarketAuthLoginRequest
      )
      .pipe(
        this.retryTransientAuthFailures('login'),
        map((response) => this.toSession(response)),
        tap((session) => this.persistSession(session)),
        finalize(() => {
          this.loginInFlight$ = undefined;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );

    return this.loginInFlight$;
  }

  private handleRefreshFailure(error: unknown): Observable<MarketAuthSession> {
    if (error instanceof HttpErrorResponse && (error.status === 400 || error.status === 401)) {
      this.clearSession();

      return this.login();
    }

    return throwError(() => error);
  }

  private persistSession(session: MarketAuthSession): void {
    this.sessionState.next(session);
    this.scheduleRefresh(session);
  }

  private scheduleRefresh(session: MarketAuthSession): void {
    this.refreshTimerSubscription?.unsubscribe();

    const refreshAtMs = Math.max(
      session.expiresAt - environment.marketData.refreshWindowMs - Date.now(),
      1_000
    );

    this.refreshTimerSubscription = timer(refreshAtMs).subscribe(() => {
      this.refreshAccessToken().subscribe({
        error: () => {
          this.clearSession();
        }
      });
    });
  }

  private isRefreshWindow(session: MarketAuthSession): boolean {
    return session.expiresAt - Date.now() <= environment.marketData.refreshWindowMs;
  }

  private toSession(response: MarketAuthLoginResponse): MarketAuthSession {
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: Date.now() + response.expires_in * 1_000
    };
  }

  private retryTransientAuthFailures<T>(operation: string) {
    return (source: Observable<T>): Observable<T> =>
      source.pipe(
        retryWhen((errors) =>
          errors.pipe(
            scan((attempt, error) => {
              const httpError = error as HttpErrorResponse;

              if (!this.isTransientError(httpError) || attempt >= environment.marketData.reconnect.maxAuthRetries) {
                throw error;
              }

              return attempt + 1;
            }, 0),
            delayWhen((attempt) => timer(this.reconnectStrategy.nextAuthDelay(attempt))),
            tap((attempt) => {
              if (!environment.production) {
                console.warn(`[market-auth] Retrying ${operation} attempt ${attempt}.`);
              }
            })
          )
        )
      );
  }

  private isTransientError(error: HttpErrorResponse): boolean {
    return error.status === 0 || error.status >= 500;
  }
}

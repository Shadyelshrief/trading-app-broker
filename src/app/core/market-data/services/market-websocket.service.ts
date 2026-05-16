import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  Subject,
  Subscription,
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  take,
  tap,
  timer
} from 'rxjs';
import { WebSocketSubject, webSocket } from 'rxjs/webSocket';

import {
  AUTHENTICATION_GRACE_PERIOD_MS,
  MARKET_ACTIONS,
  TOPIC_BATCH_DEBOUNCE_MS
} from '../constants/market-actions.constants';
import {
  FeederInboundMessage,
  FeederOutboundMessage
} from '../interfaces/feeder-message.interface';
import { WebSocketState } from '../models/websocket-state.model';
import { normalizeTopic } from '../utils/topic-parser.util';
import { environment } from '../../../../environments/environment';
import { MarketAuthService } from './market-auth.service';
import { ReconnectStrategyService } from './reconnect-strategy.service';

const INITIAL_STATE: WebSocketState = {
  status: 'disconnected',
  reconnectAttempt: 0,
  connectedAt: null,
  authenticatedAt: null,
  lastMessageAt: null,
  lastError: null
};

@Injectable({ providedIn: 'root' })
export class MarketWebsocketService {
  private readonly auth = inject(MarketAuthService);
  private readonly reconnectStrategy = inject(ReconnectStrategyService);

  private readonly stateSubject = new BehaviorSubject<WebSocketState>(INITIAL_STATE);
  private readonly inboundMessagesSubject = new Subject<FeederInboundMessage<unknown>>();
  private readonly flushQueueSubject = new Subject<void>();
  private readonly desiredTopics = new Set<string>();
  private readonly activeTopics = new Set<string>();

  private socket?: WebSocketSubject<FeederInboundMessage<unknown> | FeederOutboundMessage>;
  private transportSubscription?: Subscription;
  private reconnectSubscription?: Subscription;
  private authenticationGraceSubscription?: Subscription;
  private isManualDisconnect = false;
  private reconnectScheduled = false;
  private reconnectAttempt = 0;

  readonly connectionState$ = this.stateSubject.asObservable().pipe(
    distinctUntilChanged(
      (previous, current) =>
        previous.status === current.status &&
        previous.reconnectAttempt === current.reconnectAttempt &&
        previous.lastError === current.lastError
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly messages$ = this.inboundMessagesSubject.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: true }));

  constructor() {
    this.flushQueueSubject.pipe(debounceTime(TOPIC_BATCH_DEBOUNCE_MS)).subscribe(() => {
      this.flushDesiredSubscriptions();
    });

    this.auth.accessToken$
      .pipe(filter((token): token is string => Boolean(token)))
      .subscribe((token) => {
        if (!this.socket) {
          return;
        }

        const status = this.stateSubject.value.status;

        if (status === 'connected' || status === 'authenticated' || status === 'authenticating') {
          this.authenticate(token);
        }
      });
  }

  connect(): void {
    if (this.socket || this.stateSubject.value.status === 'connecting' || this.reconnectScheduled) {
      return;
    }

    this.isManualDisconnect = false;
    this.reconnectScheduled = false;
    this.stateSubject.next({
      ...this.stateSubject.value,
      status: this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting',
      reconnectAttempt: this.reconnectAttempt,
      lastError: null
    });

    this.auth.ensureAuthenticated().pipe(take(1)).subscribe({
      next: (session) => this.openSocket(session.accessToken),
      error: (error) => this.handleConnectionFailure(error)
    });
  }

  disconnect(): void {
    this.isManualDisconnect = true;
    this.reconnectScheduled = false;
    this.reconnectSubscription?.unsubscribe();
    this.authenticationGraceSubscription?.unsubscribe();
    this.activeTopics.clear();
    this.desiredTopics.clear();
    this.transportSubscription?.unsubscribe();
    this.transportSubscription = undefined;

    if (this.socket) {
      this.socket.complete();
      this.socket = undefined;
    }

    this.stateSubject.next({ ...INITIAL_STATE });
  }

  subscribeTopic(topic: string): void {
    const normalizedTopic = normalizeTopic(topic);

    this.desiredTopics.add(normalizedTopic);
    this.connect();
    this.flushQueueSubject.next();
  }

  subscribeMany(topics: string[]): void {
    topics.forEach((topic) => {
      this.desiredTopics.add(normalizeTopic(topic));
    });

    this.connect();
    this.flushQueueSubject.next();
  }

  unsubscribeTopic(topic: string): void {
    const normalizedTopic = normalizeTopic(topic);

    this.desiredTopics.delete(normalizedTopic);

    if (this.activeTopics.delete(normalizedTopic)) {
      this.send({
        action: MARKET_ACTIONS.unsubscribe,
        target: normalizedTopic
      });
    }
  }

  observeMessages(): Observable<FeederInboundMessage<unknown>> {
    return this.messages$;
  }

  getConnectionState(): Observable<WebSocketState> {
    return this.connectionState$;
  }

  private openSocket(accessToken: string): void {
    this.socket = webSocket<FeederInboundMessage<unknown> | FeederOutboundMessage>({
      url: environment.marketData.webSocketUrl,
      serializer: (message) => JSON.stringify(message),
      deserializer: ({ data }) => JSON.parse(data as string) as FeederInboundMessage<unknown>,
      openObserver: {
        next: () => {
          this.stateSubject.next({
            ...this.stateSubject.value,
            status: 'connected',
            connectedAt: Date.now(),
            lastError: null
          });
          this.reconnectScheduled = false;

          this.authenticate(accessToken);
        }
      },
      closeObserver: {
        next: () => {
          this.transportSubscription = undefined;
          this.socket = undefined;
          this.activeTopics.clear();

          if (!this.isManualDisconnect) {
            this.scheduleReconnect();
            return;
          }

          this.stateSubject.next({ ...INITIAL_STATE });
        }
      }
    });

    this.transportSubscription = this.socket.subscribe({
      next: (message) => this.handleInboundMessage(message as FeederInboundMessage<unknown>),
      error: (error) => this.handleConnectionFailure(error),
      complete: () => undefined
    });
  }

  private authenticate(token: string): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      status: 'authenticating',
      lastError: null
    });

    this.send({
      action: MARKET_ACTIONS.authenticate,
      token
    });

    this.authenticationGraceSubscription?.unsubscribe();
    this.authenticationGraceSubscription = timer(AUTHENTICATION_GRACE_PERIOD_MS).subscribe(() => {
      if (this.stateSubject.value.status === 'authenticating') {
        this.markAuthenticated();
      }
    });
  }

  private markAuthenticated(): void {
    this.authenticationGraceSubscription?.unsubscribe();
    this.reconnectAttempt = 0;

    this.stateSubject.next({
      ...this.stateSubject.value,
      status: 'authenticated',
      authenticatedAt: Date.now(),
      reconnectAttempt: 0,
      lastError: null
    });

    this.flushDesiredSubscriptions();
  }

  private flushDesiredSubscriptions(): void {
    if (this.stateSubject.value.status !== 'authenticated') {
      return;
    }

    const pendingTopics = Array.from(this.desiredTopics).filter((topic) => !this.activeTopics.has(topic));

    if (pendingTopics.length === 0) {
      return;
    }

    if (pendingTopics.length === 1) {
      const [target] = pendingTopics;

      this.send({
        action: MARKET_ACTIONS.subscribe,
        target
      });

      this.activeTopics.add(target);
      return;
    }

    this.send({
      action: MARKET_ACTIONS.subscribeBulk,
      targets: pendingTopics
    });

    pendingTopics.forEach((topic) => this.activeTopics.add(topic));
  }

  private handleInboundMessage(message: FeederInboundMessage<unknown>): void {
    const now = Date.now();

    this.stateSubject.next({
      ...this.stateSubject.value,
      lastMessageAt: now
    });

    if (this.isAuthenticationFailure(message)) {
      this.stateSubject.next({
        ...this.stateSubject.value,
        status: 'auth-failed',
        lastError: this.readErrorMessage(message)
      });

      this.auth.refreshAccessToken().pipe(take(1)).subscribe({
        next: (session) => this.authenticate(session.accessToken),
        error: (error) => this.handleConnectionFailure(error)
      });
      return;
    }

    if (this.isAuthenticationAcknowledged(message)) {
      this.markAuthenticated();
      return;
    }

    this.inboundMessagesSubject.next(message);
  }

  private handleConnectionFailure(error: unknown): void {
    const lastError = error instanceof Error ? error.message : 'Market websocket connection failed.';

    this.stateSubject.next({
      ...this.stateSubject.value,
      status: 'error',
      lastError
    });

    if (!this.isManualDisconnect) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectScheduled || this.isManualDisconnect) {
      return;
    }

    this.reconnectScheduled = true;
    this.reconnectSubscription?.unsubscribe();
    this.authenticationGraceSubscription?.unsubscribe();
    this.socket = undefined;
    this.transportSubscription?.unsubscribe();
    this.transportSubscription = undefined;
    this.reconnectAttempt += 1;

    const delayMs = this.reconnectStrategy.nextWebSocketDelay(this.reconnectAttempt);
    const canRetry = environment.marketData.enableAutoReconnect !== false;

    this.stateSubject.next({
      ...this.stateSubject.value,
      status: canRetry ? 'reconnecting' : 'error',
      reconnectAttempt: this.reconnectAttempt,
      lastError:
        this.stateSubject.value.lastError ??
        (canRetry ? `Reconnecting in ${delayMs}ms.` : 'Market data connection is unavailable.')
    });

    if (!canRetry) {
      this.reconnectScheduled = false;
      return;
    }

    this.reconnectSubscription = timer(delayMs).subscribe(() => {
      this.connect();
    });
  }

  private send(message: FeederOutboundMessage): void {
    if (!this.socket) {
      return;
    }

    this.socket.next(message);
  }

  private isAuthenticationAcknowledged(message: FeederInboundMessage<unknown>): boolean {
    const marker = `${message.action ?? message.event ?? message.type ?? ''}`.toLowerCase();

    return marker === 'authenticated' || marker === 'auth_ok' || marker === 'auth_success';
  }

  private isAuthenticationFailure(message: FeederInboundMessage<unknown>): boolean {
    const marker = `${message.action ?? message.event ?? message.type ?? ''}`.toLowerCase();
    const errorMessage = this.readErrorMessage(message).toLowerCase();

    return (
      marker === 'auth_failed' ||
      marker === 'authentication_error' ||
      marker === 'unauthorized' ||
      errorMessage.includes('token') ||
      errorMessage.includes('unauthorized')
    );
  }

  private readErrorMessage(message: FeederInboundMessage<unknown>): string {
    if (typeof message.error === 'string') {
      return message.error;
    }

    if (message.error && typeof message.error === 'object' && typeof message.error.message === 'string') {
      return message.error.message;
    }

    return 'Unknown websocket error.';
  }
}

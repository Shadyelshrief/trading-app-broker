import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, distinctUntilChanged, map, shareReplay, startWith, throwError } from 'rxjs';

import { FeederInboundMessage } from '../interfaces/feeder-message.interface';
import { MarketStream } from '../interfaces/market-stream.interface';
import { MarketMessage } from '../models/market-message.model';
import { WebSocketState } from '../models/websocket-state.model';
import { normalizeTopic } from '../utils/topic-parser.util';
import { SubscriptionRegistryService } from './subscription-registry.service';
import { MarketWebsocketService } from './market-websocket.service';

@Injectable({ providedIn: 'root' })
export class MarketDataService implements MarketStream {
  private readonly registry = inject(SubscriptionRegistryService);
  private readonly socket = inject(MarketWebsocketService);

  constructor() {
    this.socket.observeMessages().subscribe((message) => {
      const normalized = this.extractTopic(message);

      if (!normalized) {
        return;
      }

      const normalizedMessage = this.toMarketMessage(normalized, message);

      this.registry.publish(normalized, normalizedMessage.payload, normalizedMessage.receivedAt);
      this.registry.markFeederSubscribed(normalized, true);
    });
  }

  connect(): Observable<WebSocketState> {
    this.socket.connect();

    return this.getConnectionState();
  }

  disconnect(): void {
    this.socket.disconnect();
    this.registry.clearFeederSubscriptions();
  }

  observe<TPayload>(topic: string): Observable<TPayload> {
    try {
      const normalized = normalizeTopic(topic);
      const stream$ = this.registry.getStream<TPayload>(normalized);

      return new Observable<TPayload>((subscriber) => {
        this.socket.connect();

        const totalSubscribers = this.registry.acquireObserver(normalized);

        if (totalSubscribers === 1) {
          this.socket.subscribeTopic(normalized);
        }

        const streamSubscription = stream$.subscribe(subscriber);

        return () => {
          streamSubscription.unsubscribe();

          const remainingSubscribers = this.registry.releaseObserver(normalized);

          if (remainingSubscribers === 0) {
            this.socket.unsubscribeTopic(normalized);
            this.registry.markFeederSubscribed(normalized, false);
          }
        };
      }).pipe(distinctUntilChanged(), shareReplay({ bufferSize: 1, refCount: true }));
    } catch (error) {
      return throwError(() => error);
    }
  }

  observeMany<TPayload>(topics: string[]): Observable<Record<string, TPayload>> {
    const normalizedTopics = Array.from(new Set(topics.map((topic) => normalizeTopic(topic))));

    if (normalizedTopics.length === 0) {
      return throwError(() => new Error('observeMany requires at least one topic.'));
    }

    return combineLatest(
      normalizedTopics.map((topic) =>
        this.observe<TPayload>(topic).pipe(
          startWith(this.getSnapshot<TPayload>(topic)),
          map((payload) => ({ topic, payload }))
        )
      )
    ).pipe(
      map((entries) =>
        entries.reduce<Record<string, TPayload>>((accumulator, entry) => {
          if (entry.payload !== undefined) {
            accumulator[entry.topic] = entry.payload;
          }
          return accumulator;
        }, {})
      ),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  subscribe(topic: string): void {
    const normalized = normalizeTopic(topic);
    const totalSubscribers = this.registry.acquireManual(normalized);

    this.socket.connect();

    if (totalSubscribers === 1) {
      this.socket.subscribeTopic(normalized);
    }
  }

  unsubscribe(topic: string): void {
    const normalized = normalizeTopic(topic);
    const remainingSubscribers = this.registry.releaseManual(normalized);

    if (remainingSubscribers === 0) {
      this.socket.unsubscribeTopic(normalized);
      this.registry.markFeederSubscribed(normalized, false);
    }
  }

  getSnapshot<TPayload>(topic: string): TPayload | undefined {
    return this.registry.getSnapshot<TPayload>(normalizeTopic(topic));
  }

  getConnectionState(): Observable<WebSocketState> {
    return this.socket.getConnectionState();
  }

  private extractTopic(message: FeederInboundMessage<unknown>): string | null {
    const topic = typeof message.target === 'string' ? message.target : message.topic;

    if (!topic) {
      return null;
    }

    return normalizeTopic(topic);
  }

  private toMarketMessage(topic: string, message: FeederInboundMessage<unknown>): MarketMessage<unknown> {
    return {
      topic,
      payload: this.extractPayload(message),
      receivedAt: this.resolveTimestamp(message.timestamp),
      sequence: typeof message.sequence === 'number' ? message.sequence : undefined,
      snapshot: Boolean(message.snapshot),
      raw: message
    };
  }

  private extractPayload(message: FeederInboundMessage<unknown>): unknown {
    if ('payload' in message && message.payload !== undefined) {
      return message.payload;
    }

    if ('data' in message && message.data !== undefined) {
      return message.data;
    }

    if ('body' in message && message.body !== undefined) {
      return message.body;
    }

    const { action, event, type, target, topic, timestamp, sequence, snapshot, success, error, ...payload } =
      message;

    return payload;
  }

  private resolveTimestamp(value: number | string | undefined): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Date.parse(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return Date.now();
  }
}

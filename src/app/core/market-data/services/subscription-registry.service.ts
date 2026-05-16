import { Injectable } from '@angular/core';
import { Observable, ReplaySubject, shareReplay } from 'rxjs';

import { SubscriptionMetadata, TopicSubscription } from '../models/subscription.model';

@Injectable({ providedIn: 'root' })
export class SubscriptionRegistryService {
  private readonly registry = new Map<string, TopicSubscription<unknown>>();

  ensureTopic<TPayload>(topic: string): TopicSubscription<TPayload> {
    const existing = this.registry.get(topic);

    if (existing) {
      return existing as TopicSubscription<TPayload>;
    }

    const subject = new ReplaySubject<TPayload>(1);
    const stream$ = subject.asObservable().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    const created: TopicSubscription<TPayload> = {
      topic,
      subject,
      stream$,
      subscriberCount: 0,
      observerCount: 0,
      manualHoldCount: 0,
      subscriptionTimestamp: null,
      lastMessageTimestamp: null,
      feederSubscribed: false
    };

    this.registry.set(topic, created as TopicSubscription<unknown>);

    return created;
  }

  acquireObserver(topic: string): number {
    const entry = this.ensureTopic(topic);

    entry.observerCount += 1;
    this.syncCounters(entry);

    return entry.subscriberCount;
  }

  releaseObserver(topic: string): number {
    const entry = this.ensureTopic(topic);

    entry.observerCount = Math.max(0, entry.observerCount - 1);
    this.syncCounters(entry);

    return entry.subscriberCount;
  }

  acquireManual(topic: string): number {
    const entry = this.ensureTopic(topic);

    entry.manualHoldCount += 1;
    this.syncCounters(entry);

    return entry.subscriberCount;
  }

  releaseManual(topic: string): number {
    const entry = this.ensureTopic(topic);

    entry.manualHoldCount = Math.max(0, entry.manualHoldCount - 1);
    this.syncCounters(entry);

    return entry.subscriberCount;
  }

  publish<TPayload>(topic: string, payload: TPayload, receivedAt: number = Date.now()): void {
    const entry = this.ensureTopic<TPayload>(topic);

    entry.lastValue = payload;
    entry.lastMessageTimestamp = receivedAt;
    entry.subject.next(payload);
  }

  getSnapshot<TPayload>(topic: string): TPayload | undefined {
    return this.ensureTopic<TPayload>(topic).lastValue;
  }

  getStream<TPayload>(topic: string): Observable<TPayload> {
    return this.ensureTopic<TPayload>(topic).stream$;
  }

  getMetadata(topic: string): SubscriptionMetadata | undefined {
    return this.registry.get(topic);
  }

  listDesiredTopics(): string[] {
    return Array.from(this.registry.values())
      .filter((entry) => entry.subscriberCount > 0)
      .map((entry) => entry.topic);
  }

  markFeederSubscribed(topic: string, subscribed: boolean): void {
    this.ensureTopic(topic).feederSubscribed = subscribed;
  }

  clearFeederSubscriptions(): void {
    this.registry.forEach((entry) => {
      entry.feederSubscribed = false;
    });
  }

  private syncCounters(entry: TopicSubscription<unknown>): void {
    entry.subscriberCount = entry.observerCount + entry.manualHoldCount;

    if (entry.subscriberCount > 0 && entry.subscriptionTimestamp === null) {
      entry.subscriptionTimestamp = Date.now();
    }
  }
}

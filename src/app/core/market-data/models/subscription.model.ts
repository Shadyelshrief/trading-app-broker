import { Observable, ReplaySubject } from 'rxjs';

export interface SubscriptionMetadata<TPayload = unknown> {
  topic: string;
  subscriberCount: number;
  observerCount: number;
  manualHoldCount: number;
  stream$: Observable<TPayload>;
  lastValue?: TPayload;
  subscriptionTimestamp: number | null;
  lastMessageTimestamp: number | null;
  feederSubscribed: boolean;
}

export interface TopicSubscription<TPayload = unknown> extends SubscriptionMetadata<TPayload> {
  subject: ReplaySubject<TPayload>;
}

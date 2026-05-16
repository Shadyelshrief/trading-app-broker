import { Observable } from 'rxjs';

import { WebSocketState } from '../models/websocket-state.model';

export interface MarketStream {
  connect(): Observable<WebSocketState>;
  disconnect(): void;
  observe<T>(topic: string): Observable<T>;
  observeMany<T>(topics: string[]): Observable<Record<string, T>>;
  subscribe(topic: string): void;
  unsubscribe(topic: string): void;
  getSnapshot<T>(topic: string): T | undefined;
  getConnectionState(): Observable<WebSocketState>;
}

import { Injectable, inject } from '@angular/core';

import { MarketWebsocketService } from '../../core/market-data';

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly websocket = inject(MarketWebsocketService);

  readonly connectionState$ = this.websocket.getConnectionState();

  connect(): void {
    this.websocket.connect();
  }

  disconnect(): void {
    this.websocket.disconnect();
  }
}

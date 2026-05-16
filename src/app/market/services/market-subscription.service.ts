import { Injectable, inject } from '@angular/core';
import { Observable, finalize } from 'rxjs';

import { MarketDataService as CoreMarketDataService } from '../../core/market-data';

@Injectable({ providedIn: 'root' })
export class MarketSubscriptionService {
  private readonly marketData = inject(CoreMarketDataService);

  observeTopic<T>(topic: string): Observable<T> {
    return this.marketData.observe<T>(topic).pipe(
      finalize(() => {
        /* shared market-data layer owns subscription cleanup */
      })
    );
  }

  subscribe(topic: string): void {
    this.marketData.subscribe(topic);
  }

  unsubscribe(topic: string): void {
    this.marketData.unsubscribe(topic);
  }
}

# Market Data Layer

## Environment configuration

The feeder connection is configured in:

- `src/environments/environment.ts`
- `src/environments/environment.prod.ts`

Required values:

- websocket URL
- auth base path
- service credentials
- reconnect policy
- refresh skew window

## Widget usage

```ts
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { MarketDataService, MarketTick } from './index';

@Component({
  selector: 'app-price-widget',
  standalone: true,
  template: `
    @if (tick$ | async; as tick) {
      <div>{{ tick.symbol }} {{ tick.lastPrice }}</div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PriceWidgetComponent {
  private readonly marketData = inject(MarketDataService);

  readonly tick$ = this.marketData.observe<MarketTick>('market:adx:ihc:tick');
}
```

## Imperative snapshot usage

```ts
const tick = this.marketData.getSnapshot<MarketTick>('market:adx:ihc:tick');
```

## Cleanup lifecycle example

`observe()` cleans itself up automatically when the RxJS subscription completes or the Angular view is destroyed.

For manual background subscriptions:

```ts
ngOnInit(): void {
  this.marketData.subscribe('private:orders:filled');
}

ngOnDestroy(): void {
  this.marketData.unsubscribe('private:orders:filled');
}
```

## Unit test examples

See:

- `src/app/core/market-data/utils/topic-parser.util.spec.ts`
- `src/app/core/market-data/services/subscription-registry.service.spec.ts`

## Production best practices

- Keep feeder credentials in deployment-time environment configuration.
- Prefer `observe()` for UI widgets and reserve manual `subscribe()` for orchestration/background tasks.
- Map raw feeder payloads to domain-specific models inside feature facades instead of UI components.
- Keep widgets `OnPush` and consume streams with `async` or signals to minimize rerenders.
- Avoid deep object mutation in adapters so `distinctUntilChanged()` and memoized selectors stay effective.

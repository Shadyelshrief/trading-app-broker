import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketTickerComponent, MarketTickerItem } from '../../shared/components/market-ticker/market-ticker.component';
import { TICKER_MARKET_OPTIONS, TickerMode } from '../ticker-settings.models';
import { PricingTickerFacade } from './pricing-ticker.facade';
import { mapPricingTickerItemToMarketTicker } from './pricing-ticker.mapper';
import { PricingTickerItem } from './pricing-ticker.models';

@Component({
  selector: 'app-pricing-ticker',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MarketTickerComponent],
  templateUrl: './pricing-ticker.component.html',
  styleUrl: './pricing-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PricingTickerFacade]
})
export class PricingTickerComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(PricingTickerFacade);
  private readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly marketOptions = TICKER_MARKET_OPTIONS;
  protected readonly modes: readonly { label: string; value: TickerMode }[] = [
    { label: 'Actual Market Feed', value: 'MARKET_FEED' },
    { label: 'Latest Price', value: 'LATEST_PRICE' },
    { label: 'Accumulated Volume By Price', value: 'ACCUMULATED_VOLUME_BY_PRICE' }
  ];

  protected toTickerItems(items: readonly PricingTickerItem[]): MarketTickerItem[] {
    return items.map((item) => mapPricingTickerItemToMarketTicker(item));
  }

  protected openPriceQuote(item: MarketTickerItem): void {
    const row = item.raw as PricingTickerItem | undefined;

    if (!row) {
      return;
    }

    this.workspace.openPanel({
      type: 'price-quote',
      state: {
        title: `Price Quote - ${row.symbolId}`,
        route: `/app/pricing/price-quote/${row.market.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: 'price-quote',
        context: {
          quote: {
            symbolId: row.symbolId,
            symbolName: row.symbolName,
            market: row.market,
            currency: row.currency,
            lastPrice: row.tradePrice,
            change: row.change,
            changePercent: row.changePercent,
            direction: row.changeDirection
          }
        }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

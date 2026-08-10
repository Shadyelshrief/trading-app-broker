import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { ProductDetailsDialogService } from '../../market/price-quote/product-details-dialog.service';
import { MarketDropdownComponent } from '../../shared/components';
import { MarketTickerComponent, MarketTickerItem } from '../../shared/components/market-ticker/market-ticker.component';
import { TickerMode } from '../ticker-settings.models';
import { TradingTickerFacade } from './trading-ticker.facade';
import { mapTradingTickerItemToMarketTicker } from './trading-ticker.mapper';
import { TradingTickerItem } from './trading-ticker.models';

@Component({
  selector: 'app-trading-ticker',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MarketDropdownComponent, MarketTickerComponent],
  templateUrl: './trading-ticker.component.html',
  styleUrl: './trading-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TradingTickerFacade]
})
export class TradingTickerComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(TradingTickerFacade);
  private readonly productDetails = inject(ProductDetailsDialogService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly modes: readonly { label: string; value: TickerMode }[] = [
    { label: 'Actual Market Feed', value: 'MARKET_FEED' },
    { label: 'Latest Price', value: 'LATEST_PRICE' },
    { label: 'Accumulated Volume By Price', value: 'ACCUMULATED_VOLUME_BY_PRICE' }
  ];

  protected toTickerItems(items: readonly TradingTickerItem[]): MarketTickerItem[] {
    return items.map((item) => mapTradingTickerItemToMarketTicker(item));
  }

  protected openPriceQuote(item: MarketTickerItem): void {
    const row = item.raw as TradingTickerItem | undefined;

    if (!row) {
      return;
    }

    this.productDetails.open({
      ...row,
      lastPrice: row.tradePrice,
      direction: row.changeDirection
    });
  }

  captureState() {
    return this.state();
  }
}

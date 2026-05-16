import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { FullMarketRow } from '../models/full-market-row.model';
import { createFullMarketColumns } from './full-market.columns';
import { FullMarketFacade } from './full-market.facade';

@Component({
  selector: 'app-full-market-page',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatSelectModule,
    MatSlideToggleModule,
    MarketGridComponent
  ],
  templateUrl: './full-market-page.component.html',
  styleUrl: './full-market-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FullMarketFacade]
})
export class FullMarketPageComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(FullMarketFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = createFullMarketColumns();
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly menuActions: MarketGridContextAction<FullMarketRow>[] = [
    { id: 'watchlist', label: 'Add To Watch List' },
    { id: 'watchlist-wizard', label: 'Add To Watch List Wizard' },
    { id: 'chart', label: 'Charting' },
    { id: 'depth-order', label: 'Market Depth By Order' },
    { id: 'depth-order-special', label: 'Market Depth By Order Special' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'news', label: 'News & Announcements' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' },
    { id: 'quote', label: 'Price Quote' },
    { id: 'spectrum', label: 'Price Spectrum' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'time-sales', label: 'Time & Sales' }
  ];

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => this.facade.updateFilters({ search }));
  }

  protected selectExchange(exchange: string): void {
    this.facade.updateFilters({ exchange: exchange.toLowerCase() });
  }

  protected selectSector(sector: string): void {
    this.facade.updateFilters({ sector });
  }

  protected selectDirection(direction: 'ALL' | 'UP' | 'DOWN' | 'UNCHANGED'): void {
    this.facade.updateFilters({ direction });
  }

  protected toggleAutoScroll(value: boolean): void {
    this.facade.updateSettings({ autoScroll: value });
  }

  protected openPriceQuote(row: FullMarketRow): void {
    this.workspace.openPanel({
      type: 'price-quote',
      state: {
        title: `Price Quote - ${row.symbolId}`,
        route: `/app/pricing/price-quote/${row.market.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: 'price-quote',
        context: {
          quote: row
        }
      }
    });
  }

  protected openOrderTicket(side: 'buy' | 'sell', row: FullMarketRow): void {
    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: `${side === 'buy' ? 'Buy' : 'Sell'} Order - ${row.symbolId}`,
        route: `/app/trading/order-entry/${side}/${row.market.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'trading',
        screen: 'order-entry',
        context: {
          side,
          order: row
        }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

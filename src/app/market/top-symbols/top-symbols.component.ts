import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { distinctUntilChanged } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { TopSymbolsFacade } from './top-symbols.facade';
import { TopSymbolRow, TopSymbolsViewKey } from './top-symbols.models';

@Component({
  selector: 'app-top-symbols',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSliderModule,
    MarketGridComponent
  ],
  templateUrl: './top-symbols.component.html',
  styleUrl: './top-symbols.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TopSymbolsFacade]
})
export class TopSymbolsComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(TopSymbolsFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly marketControl = new FormControl<'all' | 'tadawul' | 'dfm' | 'adx'>('adx', {
    nonNullable: true
  });
  protected readonly viewControl = new FormControl<TopSymbolsViewKey>('MOST_ACTIVE_VOLUME', {
    nonNullable: true
  });
  protected readonly numberOfSymbolsControl = new FormControl(10, { nonNullable: true });
  protected readonly menuActions: MarketGridContextAction<TopSymbolRow>[] = [
    { id: 'watchlist', label: 'Add To Watch List' },
    { id: 'watchlist-wizard', label: 'Add To Watch List Wizard' },
    { id: 'chart', label: 'Charting' },
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' },
    { id: 'depth-order', label: 'Market Depth By Order' },
    { id: 'depth-order-special', label: 'Market Depth By Order Special' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'news', label: 'News & Announcements' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' },
    { id: 'quote', label: 'Price Quote' },
    { id: 'spectrum', label: 'Price Spectrum' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'time-sales', label: 'Time & Sales' }
  ];

  constructor() {
    this.marketControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((market) => this.facade.selectMarket(market));

    this.viewControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((view) => this.facade.selectView(view));

    this.numberOfSymbolsControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((count) => this.facade.selectNumberOfSymbols(count));
  }

  protected columns(selectedView: TopSymbolsViewKey) {
    return this.facade.columns(selectedView);
  }

  protected openPriceQuote(row: TopSymbolRow): void {
    this.workspace.openPanel({
      type: 'price-quote',
      state: {
        title: `Price Quote - ${row.symbolId}`,
        route: `/app/pricing/price-quote/${row.marketShortName.toLowerCase() === 'tadawul' ? 'tadawul' : row.marketShortName.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: 'price-quote',
        context: {
          quote: {
            symbolId: row.symbolId,
            symbolName: row.symbolName,
            market: row.marketShortName,
            currency: row.currency,
            lastPrice: row.lastPrice,
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

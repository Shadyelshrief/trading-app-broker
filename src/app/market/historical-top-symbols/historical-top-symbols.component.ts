import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { distinctUntilChanged } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { HistoricalTopSymbolsFacade } from './historical-top-symbols.facade';
import {
  HistoricalTopSymbolRow,
  HistoricalTopSymbolsViewKey
} from './historical-top-symbols.models';

@Component({
  selector: 'app-historical-top-symbols',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSliderModule,
    MarketGridComponent
  ],
  templateUrl: './historical-top-symbols.component.html',
  styleUrl: './historical-top-symbols.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HistoricalTopSymbolsFacade]
})
export class HistoricalTopSymbolsComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(HistoricalTopSymbolsFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly marketControl = new FormControl<'all' | 'tadawul' | 'dfm' | 'adx'>('adx', {
    nonNullable: true
  });
  protected readonly viewControl = new FormControl<HistoricalTopSymbolsViewKey>('MOST_ACTIVE_VOLUME', {
    nonNullable: true
  });
  protected readonly numberOfSymbolsControl = new FormControl(10, { nonNullable: true });
  protected readonly fromDateControl = new FormControl<Date | null>(getDefaultFromDate());
  protected readonly toDateControl = new FormControl<Date | null>(new Date());
  protected readonly menuActions: MarketGridContextAction<HistoricalTopSymbolRow>[] = [
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

    this.fromDateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((date) => this.facade.updateFromDate(formatDateForApi(date)));

    this.toDateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((date) => this.facade.updateToDate(formatDateForApi(date)));
  }

  protected columns(selectedView: HistoricalTopSymbolsViewKey) {
    return this.facade.columns(selectedView);
  }

  protected openPriceQuote(row: HistoricalTopSymbolRow): void {
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

function getDefaultFromDate(): Date {
  const date = new Date();
  date.setDate(1);
  return date;
}

function formatDateForApi(value: Date | null): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

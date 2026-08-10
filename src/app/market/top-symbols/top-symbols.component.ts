import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSliderModule } from '@angular/material/slider';
import { distinctUntilChanged } from 'rxjs';

import { LinkedFilterGroupControlComponent, MarketDropdownComponent } from '../../shared/components';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState
} from '../../shared/services/linked-filter-group.service';
import { ProductDetailsDialogService } from '../price-quote/product-details-dialog.service';
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
    LinkedFilterGroupControlComponent,
    MarketDropdownComponent,
    MarketGridComponent
  ],
  templateUrl: './top-symbols.component.html',
  styleUrl: './top-symbols.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TopSymbolsFacade]
})
export class TopSymbolsComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(TopSymbolsFacade);
  private readonly productDetails = inject(ProductDetailsDialogService);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('top-symbols');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  protected readonly marketControl = new FormControl<'all' | 'tadawul' | 'dfm' | 'adx'>('adx', {
    nonNullable: true
  });
  protected readonly viewControl = new FormControl<TopSymbolsViewKey>('MOST_ACTIVE_VOLUME', {
    nonNullable: true
  });
  protected readonly numberOfSymbolsControl = new FormControl(10, { nonNullable: true });
  private currentMarket: 'all' | 'tadawul' | 'dfm' | 'adx' = 'adx';
  private currentView: TopSymbolsViewKey = 'MOST_ACTIVE_VOLUME';
  private currentNumberOfSymbols = 10;
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
    { id: 'quote', label: 'Product Details' },
    { id: 'spectrum', label: 'Price Spectrum' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'time-sales', label: 'Time & Sales' }
  ];

  constructor() {
    this.marketControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, true));

    this.viewControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((view) => this.applyView(view, true));

    this.numberOfSymbolsControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((count) => this.applyNumberOfSymbols(count, true));

    this.linkedFilters
      .observe<'all' | 'tadawul' | 'dfm' | 'adx'>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'market')
      .pipe(takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, false));

    this.linkedFilters
      .observe<TopSymbolsViewKey>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'selectedView')
      .pipe(takeUntilDestroyed())
      .subscribe((view) => this.applyView(view, false));

    this.linkedFilters
      .observe<number>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'numberOfSymbols')
      .pipe(takeUntilDestroyed())
      .subscribe((count) => this.applyNumberOfSymbols(count, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected columns(selectedView: TopSymbolsViewKey) {
    return this.facade.columns(selectedView);
  }

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      market: this.currentMarket,
      selectedView: this.currentView,
      numberOfSymbols: this.currentNumberOfSymbols
    });

    if (isTopSymbolsMarket(groupState['market'])) {
      this.applyMarket(groupState['market'], false);
    }

    if (isTopSymbolsView(groupState['selectedView'])) {
      this.applyView(groupState['selectedView'], false);
    }

    if (typeof groupState['numberOfSymbols'] === 'number') {
      this.applyNumberOfSymbols(groupState['numberOfSymbols'], false);
    }

    this.linkedFilterGroupSubject.next(groupId);
  }

  protected openPriceQuote(row: TopSymbolRow): void {
    this.productDetails.open(row);
  }

  captureState() {
    const state = this.state();
    const context = { ...(state?.context ?? {}) };

    if (this.linkedFilterGroup()) {
      context['linkedFilterGroup'] = this.linkedFilterGroup();
    } else {
      delete context['linkedFilterGroup'];
    }

    return { ...(state ?? {}), context };
  }

  private applyMarket(market: 'all' | 'tadawul' | 'dfm' | 'adx', publish: boolean): void {
    const next = market.toLowerCase() as 'all' | 'tadawul' | 'dfm' | 'adx';

    if (next === this.currentMarket) {
      return;
    }

    this.currentMarket = next;
    this.marketControl.setValue(next, { emitEvent: false });
    this.facade.selectMarket(next);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'market', next);
    }
  }

  private applyView(view: TopSymbolsViewKey, publish: boolean): void {
    if (view === this.currentView) {
      return;
    }

    this.currentView = view;
    this.viewControl.setValue(view, { emitEvent: false });
    this.facade.selectView(view);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'selectedView', view);
    }
  }

  private applyNumberOfSymbols(count: number, publish: boolean): void {
    if (count === this.currentNumberOfSymbols) {
      return;
    }

    this.currentNumberOfSymbols = count;
    this.numberOfSymbolsControl.setValue(count, { emitEvent: false });
    this.facade.selectNumberOfSymbols(count);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'numberOfSymbols', count);
    }
  }
}

function isTopSymbolsMarket(value: unknown): value is 'all' | 'tadawul' | 'dfm' | 'adx' {
  return value === 'all' || value === 'tadawul' || value === 'dfm' || value === 'adx';
}

function isTopSymbolsView(value: unknown): value is TopSymbolsViewKey {
  return (
    value === 'MOST_ACTIVE_VOLUME' ||
    value === 'MOST_ACTIVE_VALUE' ||
    value === 'TOP_GAINERS_PERCENT' ||
    value === 'TOP_GAINERS_CHANGE' ||
    value === 'TOP_LOSERS_PERCENT' ||
    value === 'TOP_LOSERS_CHANGE'
  );
}

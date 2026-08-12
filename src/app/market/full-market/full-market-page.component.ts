import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
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
import { buildScreenActionDescriptor } from '../../shared/utils/screen-action.util';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { LinkedFilterGroupControlComponent, MarketDropdownComponent, SectorDropdownComponent } from '../../shared/components';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState
} from '../../shared/services/linked-filter-group.service';
import { FullMarketRow } from '../models/full-market-row.model';
import { ProductDetailsDialogService } from '../price-quote/product-details-dialog.service';
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
    LinkedFilterGroupControlComponent,
    MarketDropdownComponent,
    SectorDropdownComponent,
    MarketGridComponent
  ],
  templateUrl: './full-market-page.component.html',
  styleUrl: './full-market-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FullMarketFacade]
})
export class FullMarketPageComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(FullMarketFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly productDetails = inject(ProductDetailsDialogService);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('full-market');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = createFullMarketColumns();
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  private currentExchange = 'adx';
  private currentSector = 'ALL';
  private currentSearch = '';
  private currentDirection: 'ALL' | 'UP' | 'DOWN' | 'UNCHANGED' = 'ALL';
  protected readonly menuActions: MarketGridContextAction<FullMarketRow>[] = [
    { id: 'watchlist', label: 'Add To Watch List' },
    { id: 'watchlist-wizard', label: 'Add To Watch List Wizard' },
    { id: 'chart', label: 'Charts' },
    { id: 'depth-order', label: 'Order Book' },
    { id: 'depth-order-special', label: 'Order Book (Special)' },
    { id: 'depth-price', label: 'Depth by Price' },
    { id: 'news', label: 'News & Corporate Actions' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' },
    { id: 'quote', label: 'Product Details' },
    { id: 'spectrum', label: 'Spectrum' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'time-sales', label: 'Time & Sales' }
  ];

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(150), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((search) => {
        this.currentSearch = search;
        this.facade.updateFilters({ search });
        this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'search', search);
      });

    this.linkedFilters
      .observe<string>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'market')
      .pipe(takeUntilDestroyed())
      .subscribe((market) => this.applyExchange(market, false));

    this.linkedFilters
      .observe<string>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'sector')
      .pipe(takeUntilDestroyed())
      .subscribe((sector) => this.applySector(sector, false));

    this.linkedFilters
      .observe<string>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'search')
      .pipe(takeUntilDestroyed())
      .subscribe((search) => this.applySearch(search));

    this.linkedFilters
      .observe<'ALL' | 'UP' | 'DOWN' | 'UNCHANGED'>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'direction')
      .pipe(takeUntilDestroyed())
      .subscribe((direction) => this.applyDirection(direction, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected selectExchange(exchange: string): void {
    this.applyExchange(exchange, true);
  }

  protected selectSector(sector: string): void {
    this.applySector(sector, true);
  }

  protected selectDirection(direction: 'ALL' | 'UP' | 'DOWN' | 'UNCHANGED'): void {
    this.applyDirection(direction, true);
  }

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      market: this.currentExchange,
      sector: this.currentSector,
      search: this.currentSearch,
      direction: this.currentDirection
    });

    if (typeof groupState['market'] === 'string') {
      this.applyExchange(groupState['market'], false);
    }

    if (typeof groupState['sector'] === 'string') {
      this.applySector(groupState['sector'], false);
    }

    if (typeof groupState['search'] === 'string') {
      this.applySearch(groupState['search']);
    }

    if (isFullMarketDirection(groupState['direction'])) {
      this.applyDirection(groupState['direction'], false);
    }

    this.linkedFilterGroupSubject.next(groupId);
  }

  protected toggleAutoScroll(value: boolean): void {
    this.facade.updateSettings({ autoScroll: value });
  }

  protected openPriceQuote(row: FullMarketRow): void {
    this.productDetails.open(row);
  }

  protected handleGridAction(event: { actionId: string; row: FullMarketRow | null }): void {
    const descriptor = buildScreenActionDescriptor(event.actionId, event.row);

    if (descriptor) {
      this.workspace.openScreen(descriptor);
    }
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

  private applyExchange(exchange: string, publish: boolean): void {
    const next = exchange.toLowerCase();

    if (next === this.currentExchange) {
      return;
    }

    this.currentExchange = next;
    this.currentSector = 'ALL';
    this.facade.updateFilters({ exchange: next, sector: 'ALL' });

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'market', next);
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'sector', 'ALL');
    }
  }

  private applySector(sector: string, publish: boolean): void {
    if (sector === this.currentSector) {
      return;
    }

    this.currentSector = sector;
    this.facade.updateFilters({ sector });

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'sector', sector);
    }
  }

  private applySearch(search: string): void {
    if (search === this.currentSearch) {
      return;
    }

    this.currentSearch = search;
    this.searchControl.setValue(search, { emitEvent: false });
    this.facade.updateFilters({ search });
  }

  private applyDirection(direction: 'ALL' | 'UP' | 'DOWN' | 'UNCHANGED', publish: boolean): void {
    if (direction === this.currentDirection) {
      return;
    }

    this.currentDirection = direction;
    this.facade.updateFilters({ direction });

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'direction', direction);
    }
  }
}

function isFullMarketDirection(value: unknown): value is 'ALL' | 'UP' | 'DOWN' | 'UNCHANGED' {
  return value === 'ALL' || value === 'UP' || value === 'DOWN' || value === 'UNCHANGED';
}

import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  OnInit,
  inject,
  input,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { LinkedFilterGroupControlComponent, MarketDropdownComponent } from '../../shared/components';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState
} from '../../shared/services/linked-filter-group.service';
import {
  buildMarketMapTooltip,
  criteriaLabel as resolveCriteriaLabel,
  directionClass as resolveDirectionClass,
  formatMarketMapValue
} from './market-map.mapper';
import {
  MarketMapFilters,
  MarketMapSortCriteria,
  MarketMapSymbol
} from './market-map.models';
import { MarketMapFacade } from './market-map.facade';
import { ProductDetailsDialogService } from '../price-quote/product-details-dialog.service';

interface TileContextMenuState {
  x: number;
  y: number;
  symbol: MarketMapSymbol;
}

@Component({
  selector: 'app-market-map',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    NgClass,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    LinkedFilterGroupControlComponent,
    MarketDropdownComponent
  ],
  templateUrl: './market-map.component.html',
  styleUrl: './market-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketMapFacade]
})
export class MarketMapComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(MarketMapFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly productDetails = inject(ProductDetailsDialogService);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('market-map');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly contextMenu = signal<TileContextMenuState | null>(null);
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  private currentMarket: MarketMapFilters['market'] = 'adx';
  private currentSortOrder: MarketMapFilters['sortOrder'] = 'DESC';
  private currentSortCriteria: MarketMapFilters['sortCriteria'] = 'CHANGE_PERCENT';
  protected readonly contextActions = [
    { id: 'watchlist', label: 'Add To Watch List' },
    { id: 'watchlist-wizard', label: 'Add To Watch List Wizard' },
    { id: 'chart', label: 'Charting' },
    { id: 'depth-order', label: 'Market Depth By Order' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'news', label: 'News & Announcements' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' },
    { id: 'quote', label: 'Product Details' },
    { id: 'spectrum', label: 'Price Spectrum' },
    { id: 'time-sales', label: 'Time & Sales' }
  ] as const;

  constructor() {
    this.linkedFilters
      .observe<MarketMapFilters['market']>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'market')
      .pipe(takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, false));

    this.linkedFilters
      .observe<MarketMapFilters['sortOrder']>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'sortOrder')
      .pipe(takeUntilDestroyed())
      .subscribe((sortOrder) => this.applySortOrder(sortOrder, false));

    this.linkedFilters
      .observe<MarketMapFilters['sortCriteria']>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'sortCriteria')
      .pipe(takeUntilDestroyed())
      .subscribe((sortCriteria) => this.applySortCriteria(sortCriteria, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected selectMarket(market: MarketMapFilters['market']): void {
    this.applyMarket(market, true);
  }

  protected selectSortOrder(sortOrder: MarketMapFilters['sortOrder']): void {
    this.applySortOrder(sortOrder, true);
  }

  protected selectSortCriteria(sortCriteria: MarketMapFilters['sortCriteria']): void {
    this.applySortCriteria(sortCriteria, true);
  }

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      market: this.currentMarket,
      sortOrder: this.currentSortOrder,
      sortCriteria: this.currentSortCriteria
    });

    if (typeof groupState['market'] === 'string') {
      this.applyMarket(groupState['market'] as MarketMapFilters['market'], false);
    }

    if (isMarketMapSortOrder(groupState['sortOrder'])) {
      this.applySortOrder(groupState['sortOrder'], false);
    }

    if (isMarketMapSortCriteria(groupState['sortCriteria'])) {
      this.applySortCriteria(groupState['sortCriteria'], false);
    }

    this.linkedFilterGroupSubject.next(groupId);
  }

  protected tooltipFor(symbol: MarketMapSymbol): string {
    return buildMarketMapTooltip(symbol);
  }

  protected directionClass(symbol: MarketMapSymbol): string {
    return resolveDirectionClass(symbol.direction);
  }

  protected criteriaLabel(criteria: MarketMapSortCriteria): string {
    return resolveCriteriaLabel(criteria);
  }

  protected formatValue(value: number | string, criteria: MarketMapSortCriteria): string {
    return formatMarketMapValue(value, criteria);
  }

  protected openPriceQuote(symbol: MarketMapSymbol): void {
    this.productDetails.open(symbol);
  }

  protected openContextMenu(event: MouseEvent, symbol: MarketMapSymbol): void {
    event.preventDefault();
    event.stopPropagation();

    this.contextMenu.set({
      x: event.clientX,
      y: event.clientY,
      symbol
    });
  }

  protected handleContextAction(actionId: string, symbol: MarketMapSymbol): void {
    this.closeContextMenu();

    if (actionId === 'quote') {
      this.openPriceQuote(symbol);
      return;
    }

    if (actionId === 'depth-price') {
      this.workspace.openPanel({
        type: 'market-depth-by-price',
        state: {
          title: 'Market Depth By Price',
          route: '/app/pricing/market-depth-by-price',
          section: 'pricing',
          screen: 'market-depth-by-price',
          context: { symbol }
        }
      });
      return;
    }

    if (actionId === 'depth-order') {
      this.workspace.openPanel({
        type: 'market-depth-by-order',
        state: {
          title: 'Market Depth By Order',
          route: '/app/pricing/market-depth-by-order',
          section: 'pricing',
          screen: 'market-depth-by-order',
          context: { symbol }
        }
      });
      return;
    }

    if (actionId === 'spectrum') {
      this.workspace.openPanel({
        type: 'price-spectrum',
        state: {
          title: 'Price Spectrum',
          route: '/app/pricing/price-spectrum',
          section: 'pricing',
          screen: 'price-spectrum',
          context: { symbol }
        }
      });
      return;
    }

    if (actionId === 'time-sales') {
      this.workspace.openPanel({
        type: 'time-sales',
        state: {
          title: 'Time & Sales',
          route: '/app/pricing/time-and-sales',
          section: 'pricing',
          screen: 'time-sales',
          context: { symbol }
        }
      });
      return;
    }

    if (actionId === 'buy' || actionId === 'sell') {
      this.workspace.openPanel({
        type: 'placeholder',
        state: {
          title: `${actionId === 'buy' ? 'Buy' : 'Sell'} Order - ${symbol.symbolId}`,
          route: `/app/trading/order-entry/${actionId}/${symbol.marketShortName.toLowerCase()}/${symbol.symbolId.toLowerCase()}`,
          section: 'trading',
          screen: 'order-entry',
          context: {
            side: actionId,
            symbol
          }
        }
      });
      return;
    }

    const route =
      actionId === 'chart'
        ? '/app/pricing/charts'
        : actionId === 'news'
          ? '/app/pricing/news-announcements'
          : '/app/pricing/watch-lists';

    this.workspace.openRoute(route);
  }

  protected closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  protected trackBySymbol(_index: number, symbol: MarketMapSymbol): string {
    return `${symbol.marketShortName}:${symbol.symbolId}`;
  }

  @HostListener('document:click')
  @HostListener('document:scroll')
  protected handleDocumentInteraction(): void {
    this.closeContextMenu();
  }

  @HostListener('document:keydown.escape')
  protected handleEscape(): void {
    this.closeContextMenu();
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

  private applyMarket(market: MarketMapFilters['market'], publish: boolean): void {
    const next = market.toLowerCase() as MarketMapFilters['market'];

    if (next === this.currentMarket) {
      return;
    }

    this.currentMarket = next;
    this.facade.selectMarket(next);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'market', next);
    }
  }

  private applySortOrder(sortOrder: MarketMapFilters['sortOrder'], publish: boolean): void {
    if (sortOrder === this.currentSortOrder) {
      return;
    }

    this.currentSortOrder = sortOrder;
    this.facade.selectSortOrder(sortOrder);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'sortOrder', sortOrder);
    }
  }

  private applySortCriteria(sortCriteria: MarketMapFilters['sortCriteria'], publish: boolean): void {
    if (sortCriteria === this.currentSortCriteria) {
      return;
    }

    this.currentSortCriteria = sortCriteria;
    this.facade.selectSortCriteria(sortCriteria);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'sortCriteria', sortCriteria);
    }
  }
}

function isMarketMapSortOrder(value: unknown): value is MarketMapFilters['sortOrder'] {
  return value === 'ASC' || value === 'DESC';
}

function isMarketMapSortCriteria(value: unknown): value is MarketMapFilters['sortCriteria'] {
  return value === 'CHANGE_PERCENT' || value === 'LAST_PRICE' || value === 'NUMBER_OF_TRADES';
}

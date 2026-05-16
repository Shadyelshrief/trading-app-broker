import { AsyncPipe, DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  inject,
  input,
  signal
} from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
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

interface TileContextMenuState {
  x: number;
  y: number;
  symbol: MarketMapSymbol;
}

@Component({
  selector: 'app-market-map',
  standalone: true,
  imports: [AsyncPipe, DatePipe, NgClass, MatFormFieldModule, MatSelectModule, MatTooltipModule],
  templateUrl: './market-map.component.html',
  styleUrl: './market-map.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketMapFacade]
})
export class MarketMapComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(MarketMapFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly contextMenu = signal<TileContextMenuState | null>(null);
  protected readonly contextActions = [
    { id: 'watchlist', label: 'Add To Watch List' },
    { id: 'watchlist-wizard', label: 'Add To Watch List Wizard' },
    { id: 'chart', label: 'Charting' },
    { id: 'depth-order', label: 'Market Depth By Order' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'news', label: 'News & Announcements' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' },
    { id: 'quote', label: 'Price Quote' },
    { id: 'spectrum', label: 'Price Spectrum' },
    { id: 'time-sales', label: 'Time & Sales' }
  ] as const;

  protected selectMarket(market: MarketMapFilters['market']): void {
    this.facade.selectMarket(market);
  }

  protected selectSortOrder(sortOrder: MarketMapFilters['sortOrder']): void {
    this.facade.selectSortOrder(sortOrder);
  }

  protected selectSortCriteria(sortCriteria: MarketMapFilters['sortCriteria']): void {
    this.facade.selectSortCriteria(sortCriteria);
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
    this.workspace.openPanel({
      type: 'price-quote',
      state: {
        title: `Price Quote - ${symbol.symbolId}`,
        route: `/app/pricing/price-quote/${symbol.marketShortName.toLowerCase()}/${symbol.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: 'price-quote',
        context: {
          quote: {
            symbolId: symbol.symbolId,
            symbolName: symbol.symbolName,
            market: symbol.marketShortName,
            lastPrice: symbol.lastPrice,
            change: symbol.change,
            changePercent: symbol.changePercent,
            direction: symbol.direction
          }
        }
      }
    });
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
    return this.state();
  }
}

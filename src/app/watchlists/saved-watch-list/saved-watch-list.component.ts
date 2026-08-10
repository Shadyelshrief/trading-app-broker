import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { ProductDetailsDialogService } from '../../market/price-quote/product-details-dialog.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { CreateWatchListDialogComponent } from '../create-watch-list/create-watch-list-dialog.component';
import { SavedWatchListFacade } from './saved-watch-list.facade';
import { WatchListConfig, WatchListRow } from './saved-watch-list.models';

@Component({
  selector: 'app-saved-watch-list',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatButtonModule, MatDialogModule, MarketGridComponent],
  templateUrl: './saved-watch-list.component.html',
  styleUrl: './saved-watch-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [SavedWatchListFacade]
})
export class SavedWatchListComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(SavedWatchListFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly productDetails = inject(ProductDetailsDialogService);
  private readonly dialog = inject(MatDialog);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;
  protected readonly gridOptions = {
    getRowId: (params: { data: WatchListRow }) => `${params.data.marketShortName}:${params.data.symbolId}`
  };
  protected readonly menuActions: MarketGridContextAction<WatchListRow>[] = [
    { id: 'edit-watch-list', label: 'Edit Watch List' },
    { id: 'delete-watch-list', label: 'Delete Watch List' },
    { id: 'delete-selected-symbols', label: 'Delete Selected Symbols' },
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
    effect(() => {
      const context = this.state()?.context;
      const id = typeof context?.['watchListId'] === 'string' ? context['watchListId'] : null;
      this.facade.openWatchList(id);
    });
  }

  protected editWatchList(config: WatchListConfig): void {
    this.dialog.open(CreateWatchListDialogComponent, {
      width: 'min(980px, 96vw)',
      maxHeight: '92vh',
      data: { mode: 'edit', config }
    });
  }

  protected deleteWatchList(config: WatchListConfig): void {
    if (!confirm(`Delete watch list "${config.name}"?`)) {
      return;
    }

    this.facade.deleteWatchList(config.id);
    this.workspace.openRoute('/app/pricing/watch-lists');
  }

  protected handleContextAction(
    event: { actionId: string; row: WatchListRow | null },
    config: WatchListConfig
  ): void {
    if (event.actionId === 'edit-watch-list') {
      this.editWatchList(config);
      return;
    }

    if (event.actionId === 'delete-watch-list') {
      this.deleteWatchList(config);
      return;
    }

    if (event.actionId === 'delete-selected-symbols' && event.row) {
      this.facade.deleteSymbol(config, event.row);
    }
  }

  protected openPriceQuote(row: WatchListRow): void {
    this.productDetails.open(row);
  }

  protected openOrder(side: 'buy' | 'sell', row: WatchListRow): void {
    const price = side === 'buy' ? row.offerPrice : row.bidPrice;
    const quantity = side === 'buy' ? row.offerSize : row.bidSize;

    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: `${side === 'buy' ? 'Buy' : 'Sell'} Order - ${row.symbolId}`,
        route: `/app/trading/order-entry/${side}/${row.marketShortName.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'trading',
        screen: 'order-entry',
        context: { side, order: { ...row, price, quantity } }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

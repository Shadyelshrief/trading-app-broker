import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, input, signal } from '@angular/core';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { ProductDetailsDialogService } from '../../market/price-quote/product-details-dialog.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { OrderTransactionDetailsDialogComponent } from '../order-transaction-details/order-transaction-details-dialog.component';
import { ExecutionTickerFacade } from './execution-ticker.facade';
import { ExecutionTickerRow } from './execution-ticker.models';

@Component({
  selector: 'app-execution-ticker',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatDialogModule, MarketGridComponent],
  templateUrl: './execution-ticker.component.html',
  styleUrl: './execution-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ExecutionTickerFacade]
})
export class ExecutionTickerComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(ExecutionTickerFacade);
  private readonly dialog = inject(MatDialog);
  private readonly workspace = inject(WorkspaceLayoutService);
  private readonly productDetails = inject(ProductDetailsDialogService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;
  protected readonly selectedRow = signal<ExecutionTickerRow | null>(null);
  protected readonly gridOptions = {
    getRowId: (params: { data: ExecutionTickerRow }) => params.data.id
  };
  protected readonly contextActions: MarketGridContextAction<ExecutionTickerRow>[] = [
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'transaction-details', label: 'View Order Transaction Details' },
    { id: 'quote', label: 'Product Details' },
    { id: 'chart', label: 'Charting' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'depth-order', label: 'Market Depth By Order' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' }
  ];

  constructor() {
    this.facade.start();
  }

  @HostListener('document:keydown.f1', ['$event'])
  protected onBuyShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    const row = this.selectedRow();

    if (row) {
      this.openOrder('buy', row);
    }
  }

  @HostListener('document:keydown.f2', ['$event'])
  protected onSellShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    const row = this.selectedRow();

    if (row) {
      this.openOrder('sell', row);
    }
  }

  protected selectRow(row: ExecutionTickerRow): void {
    this.selectedRow.set(row);
  }

  protected openDetails(row: ExecutionTickerRow): void {
    this.selectedRow.set(row);
    this.dialog.open(OrderTransactionDetailsDialogComponent, {
      width: 'min(1180px, 96vw)',
      maxHeight: '92vh',
      data: { row }
    });
  }

  protected handleContextAction(event: { actionId: string; row: ExecutionTickerRow | null }): void {
    const row = event.row;

    if (!row) {
      return;
    }

    this.selectedRow.set(row);

    switch (event.actionId) {
      case 'transaction-details':
        this.openDetails(row);
        return;
      case 'quote':
        this.openPriceQuote(row);
        return;
      case 'buy':
        this.openOrder('buy', row);
        return;
      case 'sell':
        this.openOrder('sell', row);
        return;
      case 'depth-price':
        this.openMarketDepth('market-depth-by-price', row);
        return;
      case 'depth-order':
        this.openMarketDepth('market-depth-by-order', row);
        return;
      case 'chart':
        this.workspace.openRoute('/app/pricing/charts');
        return;
    }
  }

  protected openPriceQuote(row: ExecutionTickerRow): void {
    this.productDetails.open(row);
  }

  protected openOrder(side: 'buy' | 'sell', row: ExecutionTickerRow): void {
    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: `${side === 'buy' ? 'Buy' : 'Sell'} Order - ${row.symbolId}`,
        route: `/app/trading/order-entry/${side}/${row.symbolId.toLowerCase()}`,
        section: 'trading',
        screen: 'order-entry',
        context: {
          side,
          order: {
            clientId: row.clientId,
            clientName: row.clientName,
            portfolioNumber: row.portfolioNumber,
            symbolId: row.symbolId,
            symbolName: row.symbolName
          }
        }
      }
    });
  }

  private openMarketDepth(type: 'market-depth-by-price' | 'market-depth-by-order', row: ExecutionTickerRow): void {
    this.workspace.openPanel({
      type,
      state: {
        title: type === 'market-depth-by-price' ? 'Market Depth By Price' : 'Market Depth By Order',
        route: `/app/pricing/${type}`,
        section: 'pricing',
        screen: type,
        context: { symbolId: row.symbolId, symbolName: row.symbolName }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

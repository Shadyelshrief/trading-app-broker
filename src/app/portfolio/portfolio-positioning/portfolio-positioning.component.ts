import { AsyncPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { GridOptions } from 'ag-grid-community';
import { debounceTime } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { CashDetailsDialogComponent } from '../cash-details/cash-details-dialog.component';
import { createPortfolioPositioningColumns } from './portfolio-positioning.columns';
import { PortfolioPositioningFacade } from './portfolio-positioning.facade';
import type { ClientOption, PortfolioPositionRow, PortfolioPositioningViewModel } from './portfolio-positioning.models';

@Component({
  selector: 'app-portfolio-positioning',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MarketGridComponent,
    ReactiveFormsModule
  ],
  templateUrl: './portfolio-positioning.component.html',
  styleUrl: './portfolio-positioning.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PortfolioPositioningFacade]
})
export class PortfolioPositioningComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(PortfolioPositioningFacade);
  private readonly dialog = inject(MatDialog);
  private readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = createPortfolioPositioningColumns();
  protected readonly clientControl = new FormControl<string | ClientOption>('', { nonNullable: true });
  protected readonly gridOptions: GridOptions<PortfolioPositionRow> = {
    getRowId: (params) => `${params.data.exchange}:${params.data.symbolId}`,
    suppressScrollOnNewData: true
  };
  protected readonly contextActions: MarketGridContextAction<PortfolioPositionRow>[] = [
    { id: 'quote', label: 'Price Quote' },
    { id: 'chart', label: 'Charting' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'depth-order', label: 'Market Depth By Order' },
    { id: 'news', label: 'News & Announcements' },
    { id: 'time-sales', label: 'Time & Sales' },
    { id: 'buy', label: 'Place Buy Order' },
    { id: 'sell', label: 'Place Sell Order' },
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' }
  ];

  constructor() {
    this.clientControl.valueChanges
      .pipe(debounceTime(180), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateClientQuery(value);
        }
      });
  }

  protected displayClient(value: string | ClientOption | null): string {
    if (!value) {
      return '';
    }

    return typeof value === 'string' ? value : `${value.clientId} - ${value.clientName}`;
  }

  protected selectClient(client: ClientOption): void {
    this.clientControl.setValue(client, { emitEvent: false });
    this.facade.selectClient(client);
  }

  protected openClientSearch(): void {
    this.workspace.openPanel({
      type: 'client-search',
      state: {
        title: 'Client Search',
        route: '/app/management/client-search',
        section: 'management',
        screen: 'client-search'
      }
    });
  }

  protected openCashDetails(vm: PortfolioPositioningViewModel): void {
    if (!vm.selectedClient || !vm.selectedPortfolio) {
      return;
    }

    this.dialog.open(CashDetailsDialogComponent, {
      width: 'min(1260px, 96vw)',
      maxWidth: '96vw',
      data: {
        clientId: vm.selectedClient.clientId,
        portfolioId: vm.selectedPortfolio.portfolioId,
        portfolioCurrency: vm.selectedPortfolio.currency
      }
    });
  }

  protected handleContextAction(event: { actionId: string; row: PortfolioPositionRow | null }): void {
    if (!event.row) {
      return;
    }

    switch (event.actionId) {
      case 'quote':
        this.openPriceQuote(event.row);
        return;
      case 'buy':
      case 'sell':
        this.openOrderTicket(event.actionId, event.row);
        return;
      case 'depth-price':
      case 'depth-order':
      case 'chart':
      case 'news':
      case 'time-sales':
        this.openRelatedPlaceholder(event.actionId, event.row);
        return;
    }
  }

  protected openPriceQuote(row: PortfolioPositionRow): void {
    this.workspace.openPanel({
      type: 'price-quote',
      state: {
        title: `Price Quote - ${row.symbolId}`,
        route: `/app/pricing/price-quote/${row.exchange.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: 'price-quote',
        context: {
          quote: {
            symbolId: row.symbolId,
            symbolName: row.symbolName,
            market: row.exchange,
            currency: row.currency,
            lastPrice: row.evaluationPrice,
            direction: row.priceDirection
          }
        }
      }
    });
  }

  private openOrderTicket(side: 'buy' | 'sell', row: PortfolioPositionRow): void {
    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: `${side === 'buy' ? 'Buy' : 'Sell'} Order - ${row.symbolId}`,
        route: `/app/trading/order-entry/${side}/${row.exchange.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'trading',
        screen: 'order-entry',
        context: { side, order: row }
      }
    });
  }

  private openRelatedPlaceholder(actionId: string, row: PortfolioPositionRow): void {
    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: `${this.titleForAction(actionId)} - ${row.symbolId}`,
        route: `/app/${actionId}/${row.exchange.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: actionId,
        context: { symbol: row }
      }
    });
  }

  private titleForAction(actionId: string): string {
    switch (actionId) {
      case 'depth-price':
        return 'Market Depth By Price';
      case 'depth-order':
        return 'Market Depth By Order';
      case 'time-sales':
        return 'Time & Sales';
      case 'news':
        return 'News & Announcements';
      default:
        return 'Charting';
    }
  }

  captureState() {
    return this.state();
  }
}

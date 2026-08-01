import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { GridOptions } from 'ag-grid-community';
import { debounceTime } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketDropdownComponent } from '../../shared/components';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { OrderConfirmationDialogComponent } from '../order-confirmation/order-confirmation-dialog.component';
import { OrderTransactionDetailsDialogComponent } from '../order-transaction-details/order-transaction-details-dialog.component';
import type { ClientOption, OrderMonitoringRow, SymbolOption } from '../services/order.models';
import { createOrderMonitoringColumns } from './order-monitoring.columns';
import { OrderMonitoringFacade } from './order-monitoring.facade';

@Component({
  selector: 'app-order-monitoring',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MarketDropdownComponent,
    MarketGridComponent,
    ReactiveFormsModule
  ],
  templateUrl: './order-monitoring.component.html',
  styleUrl: './order-monitoring.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OrderMonitoringFacade]
})
export class OrderMonitoringComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(OrderMonitoringFacade);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  private readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = createOrderMonitoringColumns();
  protected readonly selectedRow = signal<OrderMonitoringRow | null>(null);
  protected readonly gridOptions: GridOptions<OrderMonitoringRow> = {
    getRowId: (params) => params.data.orderNumber,
    suppressScrollOnNewData: true
  };
  protected readonly filters = this.fb.nonNullable.group({
    client: ['' as string | ClientOption],
    market: [''],
    symbol: ['' as string | SymbolOption],
    type: [''],
    portfolioId: [''],
    fromDate: [''],
    toDate: [''],
    orderNumber: [''],
    status: ['']
  });
  protected readonly contextActions: MarketGridContextAction<OrderMonitoringRow>[] = [
    { id: 'transaction-details', label: 'Order Transaction Details' },
    { id: 'modify', label: 'Modify Order', disabled: (row) => !row || !this.facade.permissions.canModify(row.status) },
    { id: 'cancel', label: 'Cancel Order', disabled: (row) => !row || !this.facade.permissions.canCancel(row.status) },
    { id: 'suspend', label: 'Suspend Order', disabled: (row) => !row || !this.facade.permissions.canSuspend(row.status) },
    { id: 'activate', label: 'Activate Order', disabled: (row) => !row || !this.facade.permissions.canActivate(row.status) },
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' }
  ];

  constructor() {
    this.filters.controls.client.valueChanges.pipe(debounceTime(180), takeUntilDestroyed()).subscribe((value) => {
      if (typeof value === 'string') {
        this.facade.updateClientQuery(value);
      }
    });
    this.filters.controls.symbol.valueChanges.pipe(debounceTime(180), takeUntilDestroyed()).subscribe((value) => {
      if (typeof value === 'string') {
        this.facade.updateSymbolQuery(value);
      }
    });
    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.facade.patchFilters({
        market: value.market,
        type: value.type,
        portfolioId: value.portfolioId,
        fromDate: value.fromDate,
        toDate: value.toDate,
        orderNumber: value.orderNumber,
        status: value.status
      });
    });
  }

  @HostListener('document:keydown.f8', ['$event'])
  protected onOpenMonitor(event: KeyboardEvent): void {
    event.preventDefault();
    this.facade.search();
  }

  @HostListener('document:keydown.f9', ['$event'])
  protected onCancelShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    const row = this.selectedRow();
    if (row && this.facade.permissions.canCancel(row.status)) {
      this.confirmCancel(row);
    }
  }

  @HostListener('document:keydown.f11', ['$event'])
  protected onModifyShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    const row = this.selectedRow();
    if (row && this.facade.permissions.canModify(row.status)) {
      this.openModify(row);
    }
  }

  protected displayClient(value: string | ClientOption | null): string {
    return !value ? '' : typeof value === 'string' ? value : `${value.clientId} - ${value.clientName}`;
  }

  protected displaySymbol(value: string | SymbolOption | null): string {
    return !value ? '' : typeof value === 'string' ? value : `${value.symbolId} - ${value.symbolName}`;
  }

  protected selectClient(client: ClientOption): void {
    this.filters.controls.client.setValue(client, { emitEvent: false });
    this.facade.selectClient(client);
  }

  protected selectSymbol(symbol: SymbolOption): void {
    this.filters.controls.symbol.setValue(symbol, { emitEvent: false });
    this.facade.selectSymbol(symbol);
  }

  protected reset(): void {
    this.filters.reset({ client: '', market: '', symbol: '', type: '', portfolioId: '', fromDate: '', toDate: '', orderNumber: '', status: '' });
    this.facade.reset();
  }

  protected selectRow(row: OrderMonitoringRow): void {
    this.selectedRow.set(row);
  }

  protected openDetails(row: OrderMonitoringRow): void {
    this.selectedRow.set(row);
    this.dialog.open(OrderTransactionDetailsDialogComponent, {
      width: 'min(1180px, 96vw)',
      maxHeight: '92vh',
      data: { orderNumber: row.orderNumber, row }
    });
  }

  protected handleContextAction(event: { actionId: string; row: OrderMonitoringRow | null }): void {
    const row = event.row;
    if (!row) {
      return;
    }
    this.selectedRow.set(row);
    switch (event.actionId) {
      case 'transaction-details':
        this.openDetails(row);
        return;
      case 'modify':
        this.openModify(row);
        return;
      case 'cancel':
        this.confirmCancel(row);
        return;
      case 'suspend':
        this.facade.suspend(row).subscribe(() => this.facade.search());
        return;
      case 'activate':
        this.facade.activate(row).subscribe(() => this.facade.search());
        return;
    }
  }

  protected openModify(row: OrderMonitoringRow): void {
    this.workspace.openPanel({
      type: 'order-entry',
      state: {
        title: `Modify Order - ${row.orderNumber}`,
        route: `/app/trading/order-entry/modify/${row.orderNumber}`,
        section: 'trading',
        screen: 'order-entry',
        context: { mode: 'modify', order: row }
      }
    });
  }

  protected confirmCancel(row: OrderMonitoringRow): void {
    this.dialog
      .open(OrderConfirmationDialogComponent, {
        width: 'min(520px, 94vw)',
        data: {
          title: `Cancel Order ${row.orderNumber}`,
          actionLabel: 'Confirm Cancellation',
          order: {
            clientId: row.clientId,
            portfolioId: row.portfolioId ?? row.portfolio,
            cashAccountId: '',
            symbolId: row.symbolId,
            market: row.market ?? '',
            orderSide: row.orderSide ?? 'BUY',
            orderType: row.orderType.toUpperCase().includes('MARKET') ? 'MARKET' : 'LIMIT',
            quantity: row.quantity,
            orderPrice: typeof row.price === 'number' ? row.price : undefined,
            goodTill: 'DAY',
            sessionId: '',
            fillTerm: 'MARKET_DEFAULT'
          },
          fees: 0,
          orderAmount: 0,
          expiresOn: row.expiryDate,
          portfolioLabel: row.portfolio,
          sessionLabel: ''
        }
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.confirmed) {
          this.facade.cancel(row).subscribe(() => this.facade.search());
        }
      });
  }

  captureState() {
    return this.state();
  }
}

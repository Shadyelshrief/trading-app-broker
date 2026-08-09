import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import type { GridOptions } from 'ag-grid-community';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { MarketGridContextAction } from '../../shared/models/market-grid.model';
import { formatClientDisplay } from '../../shared/utils/client-display.util';
import { createClientSearchColumns } from './client-search.columns';
import { ClientSearchFacade } from './client-search.facade';
import type { ClientSearchFilters, ClientSearchResult } from './client-search.models';

@Component({
  selector: 'app-client-search',
  standalone: true,
  imports: [
    AsyncPipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MarketGridComponent
  ],
  templateUrl: './client-search.component.html',
  styleUrl: './client-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientSearchFacade]
})
export class ClientSearchComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(ClientSearchFacade);
  private readonly workspace = inject(WorkspaceLayoutService);
  private readonly fb = inject(FormBuilder);

  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = createClientSearchColumns();
  protected readonly statusOptions: Array<NonNullable<ClientSearchFilters['status']>> = [
    'ACTIVE',
    'DORMANT',
    'SUSPENDED'
  ];
  protected readonly gridOptions: GridOptions<ClientSearchResult> = {
    getRowId: (params) => params.data.clientId,
    suppressScrollOnNewData: true
  };
  protected readonly contextActions: MarketGridContextAction<ClientSearchResult>[] = [
    { id: 'client-information', label: 'Client Information' },
    { id: 'buy', label: 'Place Order' },
    { id: 'order-monitor', label: 'View Order' },
    { id: 'portfolio-positioning', label: 'View Portfolio' },
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'print', label: 'Print' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' }
  ];
  protected readonly form = this.fb.nonNullable.group({
    clientId: [''],
    clientName: [''],
    idType: [''],
    idNumber: [''],
    status: ['' as '' | NonNullable<ClientSearchFilters['status']>],
    address: [''],
    city: [''],
    poBox: [''],
    postalCode: [''],
    telephone: [''],
    mobile: [''],
    email: ['']
  });

  protected search(): void {
    const raw = this.form.getRawValue();

    this.facade.search({
      ...raw,
      status: raw.status || undefined
    });
  }

  protected clearAll(): void {
    this.form.reset();
    this.facade.clear();
  }

  protected openClientInformation(row: ClientSearchResult): void {
    const clientLabel = formatClientDisplay(row);

    this.workspace.openPanel({
      type: 'client-information',
      state: {
        title: `Client Information - ${clientLabel}`,
        route: `/app/management/client-information/${encodeURIComponent(row.clientId)}`,
        section: 'management',
        screen: 'client-information',
        context: { clientId: row.clientId, friendlyId: row.friendlyId, clientName: row.clientName }
      }
    });
  }

  protected handleContextAction(event: { actionId: string; row: ClientSearchResult | null }): void {
    if (!event.row) {
      return;
    }

    switch (event.actionId) {
      case 'client-information':
      case 'quote':
        this.openClientInformation(event.row);
        return;
      case 'buy':
        this.openOrderEntry(event.row);
        return;
      case 'order-monitor':
        this.openOrderMonitor(event.row);
        return;
      case 'portfolio-positioning':
        this.openPortfolioPositioning(event.row);
        return;
    }
  }

  private openOrderEntry(row: ClientSearchResult): void {
    const clientLabel = formatClientDisplay(row);

    this.workspace.openPanel({
      type: 'order-entry',
      state: {
        title: `Order Entry - ${clientLabel}`,
        route: `/app/trading/order-entry/client/${encodeURIComponent(row.clientId)}`,
        section: 'trading',
        screen: 'order-entry',
        context: { client: row }
      }
    });
  }

  private openOrderMonitor(row: ClientSearchResult): void {
    const clientLabel = formatClientDisplay(row);

    this.workspace.openPanel({
      type: 'order-monitoring',
      state: {
        title: `Order Monitor - ${clientLabel}`,
        route: `/app/trading/order-monitor/${encodeURIComponent(row.clientId)}`,
        section: 'trading',
        screen: 'order-monitoring',
        context: { client: row }
      }
    });
  }

  private openPortfolioPositioning(row: ClientSearchResult): void {
    const clientLabel = formatClientDisplay(row);

    this.workspace.openPanel({
      type: 'portfolio-positioning',
      state: {
        title: `Portfolio Positioning - ${clientLabel}`,
        route: `/app/trading/portfolio-position/${encodeURIComponent(row.clientId)}`,
        section: 'trading',
        screen: 'portfolio-positioning',
        context: { client: row }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

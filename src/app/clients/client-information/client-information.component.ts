import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import type { GridOptions } from 'ag-grid-community';
import { debounceTime } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { formatClientDisplay } from '../../shared/utils/client-display.util';
import { CashAccountsDialogComponent } from '../cash-accounts/cash-accounts-dialog.component';
import { MarketsAccountsDialogComponent } from '../markets-accounts/markets-accounts-dialog.component';
import { createClientPortfolioColumns } from './client-information.columns';
import { ClientInformationFacade } from './client-information.facade';
import type {
  ClientInformationViewModel,
  ClientPortfolio,
  DeliveryChannel
} from './client-information.models';
import type { ClientSearchResult } from '../client-search/client-search.models';

@Component({
  selector: 'app-client-information',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTabsModule,
    MarketGridComponent
  ],
  templateUrl: './client-information.component.html',
  styleUrl: './client-information.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ClientInformationFacade]
})
export class ClientInformationComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(ClientInformationFacade);
  private readonly workspace = inject(WorkspaceLayoutService);
  private readonly dialog = inject(MatDialog);

  protected readonly vm$ = this.facade.vm$;
  protected readonly clientControl = new FormControl<string | ClientSearchResult>('', { nonNullable: true });
  protected readonly portfolioColumns = createClientPortfolioColumns();
  protected readonly portfolioGridOptions: GridOptions<ClientPortfolio> = {
    getRowId: (params) => params.data.portfolioId,
    suppressScrollOnNewData: true
  };
  private loadedContextClientId = '';

  constructor() {
    effect(() => {
      const context = this.state()?.context;
      const clientId = readString(context?.['clientId']);

      if (!clientId || clientId === this.loadedContextClientId) {
        return;
      }

      const client = {
        clientId,
        friendlyId: readString(context?.['friendlyId']),
        clientName: readString(context?.['clientName']) ?? clientId
      };

      this.loadedContextClientId = clientId;
      this.clientControl.setValue(client, { emitEvent: false });
      this.facade.selectClient(client);
    });

    this.clientControl.valueChanges
      .pipe(debounceTime(160), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateClientQuery(value);
        }
      });
  }

  protected displayClient(value: string | ClientSearchResult | null): string {
    return formatClientDisplay(value);
  }

  protected selectClient(client: ClientSearchResult): void {
    this.clientControl.setValue(client, { emitEvent: false });
    this.loadedContextClientId = client.clientId;
    this.facade.selectClient(client);
  }

  protected searchTypedClient(): void {
    const value = this.clientControl.value;

    if (typeof value === 'string' && value.trim()) {
      this.loadedContextClientId = value.trim();
      this.facade.loadClient(value.trim());
    }
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

  protected loginIds(vm: ClientInformationViewModel): readonly string[] {
    return this.selectedDeliveryChannel(vm)?.loginIds ?? [];
  }

  protected selectedDeliveryChannel(vm: ClientInformationViewModel): DeliveryChannel | undefined {
    return vm.deliveryChannels.find((channel) => channel.deliveryChannelId === vm.selectedDeliveryChannelId);
  }

  protected selectDeliveryChannel(deliveryChannelId: string): void {
    this.facade.selectDeliveryChannel(deliveryChannelId);
  }

  protected selectLoginId(loginId: string): void {
    this.facade.selectLoginId(loginId);
  }

  protected handlePortfolioCellClick(
    event: { row: ClientPortfolio; field: string },
    vm: ClientInformationViewModel
  ): void {
    if (!vm.selectedClient) {
      return;
    }

    if (event.field === 'marketsAccounts') {
      this.openMarketsAccounts(vm.selectedClient.clientId, event.row);
      return;
    }

    if (event.field === 'cashAccounts') {
      this.openCashAccounts(vm.selectedClient.clientId, event.row);
    }
  }

  protected openMarketsAccounts(clientId: string, portfolio: ClientPortfolio): void {
    this.dialog.open(MarketsAccountsDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      data: {
        clientId,
        portfolioId: portfolio.portfolioId,
        portfolio: portfolio.portfolio
      }
    });
  }

  protected openCashAccounts(clientId: string, portfolio: ClientPortfolio): void {
    this.dialog.open(CashAccountsDialogComponent, {
      width: 'min(820px, 94vw)',
      maxWidth: '94vw',
      data: {
        clientId,
        portfolioId: portfolio.portfolioId,
        portfolio: portfolio.portfolio
      }
    });
  }

  captureState() {
    return this.state();
  }
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import type { GridOptions } from 'ag-grid-community';
import { catchError, map, of, startWith } from 'rxjs';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { ClientService } from '../services/client.service';
import { createMarketAccountColumns } from '../client-information/client-information.columns';
import type { MarketAccount } from '../client-information/client-information.models';

export interface MarketsAccountsDialogData {
  clientId: string;
  portfolioId: string;
  portfolio: string;
}

@Component({
  selector: 'app-markets-accounts-dialog',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatDialogModule, MarketGridComponent],
  templateUrl: './markets-accounts-dialog.component.html',
  styleUrl: './markets-accounts-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketsAccountsDialogComponent {
  private readonly service = inject(ClientService);
  protected readonly data = inject<MarketsAccountsDialogData>(MAT_DIALOG_DATA);
  protected readonly columns = createMarketAccountColumns();
  protected readonly gridOptions: GridOptions<MarketAccount> = {
    getRowId: (params) => `${params.data.marketName}:${params.data.marketAccountNumber}`
  };
  protected readonly vm$ = this.service.getMarketsAccounts(this.data.clientId, this.data.portfolioId).pipe(
    map((rows) => ({ rows, loading: false, error: undefined as string | undefined })),
    catchError(() => of({ rows: [], loading: false, error: 'Unable to load markets accounts.' })),
    startWith({ rows: [], loading: true, error: undefined as string | undefined })
  );
}

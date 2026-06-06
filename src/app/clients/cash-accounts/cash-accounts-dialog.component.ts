import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import type { GridOptions } from 'ag-grid-community';
import { catchError, map, of, startWith } from 'rxjs';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { ClientService } from '../services/client.service';
import { createCashAccountColumns } from '../client-information/client-information.columns';
import type { CashAccount } from '../client-information/client-information.models';

export interface CashAccountsDialogData {
  clientId: string;
  portfolioId: string;
  portfolio: string;
}

@Component({
  selector: 'app-cash-accounts-dialog',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatDialogModule, MarketGridComponent],
  templateUrl: './cash-accounts-dialog.component.html',
  styleUrl: './cash-accounts-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashAccountsDialogComponent {
  private readonly service = inject(ClientService);
  protected readonly data = inject<CashAccountsDialogData>(MAT_DIALOG_DATA);
  protected readonly columns = createCashAccountColumns();
  protected readonly gridOptions: GridOptions<CashAccount> = {
    getRowId: (params) => `${params.data.settlementAccountNumber}:${params.data.currency}`
  };
  protected readonly vm$ = this.service.getCashAccounts(this.data.clientId, this.data.portfolioId).pipe(
    map((rows) => ({ rows, loading: false, error: undefined as string | undefined })),
    catchError(() => of({ rows: [], loading: false, error: 'Unable to load cash accounts.' })),
    startWith({ rows: [], loading: true, error: undefined as string | undefined })
  );
}

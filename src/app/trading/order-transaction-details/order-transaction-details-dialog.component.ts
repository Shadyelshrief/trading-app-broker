import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { OrderTransactionDetailsFacade } from './order-transaction-details.facade';
import { OrderTransactionDetailsDialogData } from './order-transaction-details.models';

@Component({
  selector: 'app-order-transaction-details-dialog',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatDialogModule, MarketGridComponent],
  templateUrl: './order-transaction-details-dialog.component.html',
  styleUrl: './order-transaction-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OrderTransactionDetailsFacade]
})
export class OrderTransactionDetailsDialogComponent {
  private readonly data = inject<OrderTransactionDetailsDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OrderTransactionDetailsDialogComponent>>(MatDialogRef);
  protected readonly facade = inject(OrderTransactionDetailsFacade);
  protected readonly details$ = this.data.orderNumber
    ? this.facade.loadDetails(this.data.orderNumber, this.data.row)
    : this.facade.loadDetails(this.data.row?.orderNumber ?? '--', this.data.row);
  protected readonly historyColumns = this.facade.historyColumns;
  protected readonly gridSettings = this.facade.gridSettings;

  protected close(): void {
    this.dialogRef.close();
  }
}

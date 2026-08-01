import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import type { OrderConfirmationData, OrderConfirmationResult } from '../order-entry/order-entry.models';

@Component({
  selector: 'app-order-confirmation-dialog',
  standalone: true,
  imports: [DecimalPipe, MatButtonModule, MatDialogModule],
  templateUrl: './order-confirmation-dialog.component.html',
  styleUrl: './order-confirmation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderConfirmationDialogComponent {
  protected readonly data = inject<OrderConfirmationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OrderConfirmationDialogComponent, OrderConfirmationResult>>(MatDialogRef);

  protected confirm(): void {
    this.dialogRef.close({ confirmed: true });
  }

  protected cancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}

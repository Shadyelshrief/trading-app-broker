import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { OrderModifyDialogData, OrderModifyDialogResult } from './order-modify-dialog.models';

@Component({
  selector: 'app-order-modify-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './order-modify-dialog.component.html',
  styleUrl: './order-modify-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderModifyDialogComponent {
  protected readonly data = inject<OrderModifyDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OrderModifyDialogComponent, OrderModifyDialogResult | undefined>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);
  protected readonly row = this.data.row;
  protected readonly minimumQuantity = Math.max(1, this.row.executedQuantity);
  protected readonly isMarketOrder = this.row.orderType.toUpperCase().includes('MARKET');
  private readonly currentPrice = numericValue(this.row.price);
  protected readonly form = this.fb.nonNullable.group({
    quantity: [Math.max(this.row.quantity, this.minimumQuantity), [Validators.required, Validators.min(this.minimumQuantity)]],
    orderPrice: [this.currentPrice, this.isMarketOrder ? [] : [Validators.required, Validators.min(0.000001)]]
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.dialogRef.close({
      quantity: Number(value.quantity),
      orderPrice: this.isMarketOrder ? undefined : Number(value.orderPrice)
    });
  }

  protected close(): void {
    this.dialogRef.close(undefined);
  }
}

function numericValue(value: number | string): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

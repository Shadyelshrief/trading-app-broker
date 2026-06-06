import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import type { OrderConfirmationData, OrderConfirmationResult } from '../order-entry/order-entry.models';

@Component({
  selector: 'app-order-confirmation-dialog',
  standalone: true,
  imports: [DecimalPipe, MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  templateUrl: './order-confirmation-dialog.component.html',
  styleUrl: './order-confirmation-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderConfirmationDialogComponent {
  protected readonly data = inject<OrderConfirmationData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<OrderConfirmationDialogComponent, OrderConfirmationResult>>(MatDialogRef);
  protected readonly passwordControl = new FormControl('', this.data.requirePassword ? [Validators.required] : []);

  protected confirm(): void {
    if (this.passwordControl.invalid) {
      this.passwordControl.markAsTouched();
      return;
    }

    this.dialogRef.close({
      confirmed: true,
      password: this.passwordControl.value ?? undefined
    });
  }

  protected cancel(): void {
    this.dialogRef.close({ confirmed: false });
  }
}

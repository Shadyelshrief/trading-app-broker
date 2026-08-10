import { Injectable, inject } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

import {
  ProductDetailsDialogComponent,
  ProductDetailsDialogData
} from './product-details-dialog.component';
import { buildProductDetailsDialogState } from './product-details-dialog.util';

const PRODUCT_DETAILS_DIALOG_ID = 'broker-product-details-dialog';

@Injectable({ providedIn: 'root' })
export class ProductDetailsDialogService {
  private readonly dialog = inject(MatDialog);
  private activeDialog: MatDialogRef<ProductDetailsDialogComponent> | null = null;
  private activeKey = '';

  open(source: unknown): void {
    const state = buildProductDetailsDialogState(source);

    if (!state) {
      return;
    }

    const key = `${state.context.quote.market}:${state.context.quote.symbolId}`;

    if (this.activeDialog && this.activeKey === key) {
      return;
    }

    this.activeDialog?.close();
    this.activeKey = key;
    const dialogRef = this.dialog.open<
      ProductDetailsDialogComponent,
      ProductDetailsDialogData
    >(ProductDetailsDialogComponent, {
      id: PRODUCT_DETAILS_DIALOG_ID,
      width: 'min(1180px, 94vw)',
      maxWidth: '94vw',
      height: 'min(820px, 90vh)',
      maxHeight: '90vh',
      autoFocus: false,
      restoreFocus: true,
      data: { state }
    });

    this.activeDialog = dialogRef;
    dialogRef.afterClosed().subscribe(() => {
      if (this.activeDialog === dialogRef) {
        this.activeDialog = null;
        this.activeKey = '';
      }
    });
  }
}

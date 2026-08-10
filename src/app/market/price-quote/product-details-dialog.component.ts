import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

import { PriceQuoteComponent } from './price-quote.component';
import type { ProductDetailsDialogState } from './product-details-dialog.util';

export interface ProductDetailsDialogData {
  state: ProductDetailsDialogState;
}

@Component({
  selector: 'app-product-details-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, PriceQuoteComponent],
  templateUrl: './product-details-dialog.component.html',
  styleUrl: './product-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetailsDialogComponent {
  protected readonly data = inject<ProductDetailsDialogData>(MAT_DIALOG_DATA);
}

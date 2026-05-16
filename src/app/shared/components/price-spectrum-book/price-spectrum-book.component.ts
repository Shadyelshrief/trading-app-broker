import { CommonModule, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { PriceSpectrumRow, PriceSpectrumSettings } from '../../../market/price-spectrum/price-spectrum.models';

@Component({
  selector: 'app-price-spectrum-book',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './price-spectrum-book.component.html',
  styleUrl: './price-spectrum-book.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PriceSpectrumBookComponent {
  readonly rows = input<readonly PriceSpectrumRow[]>([]);
  readonly totalBidQuantity = input(0);
  readonly totalBidOrders = input(0);
  readonly totalOfferQuantity = input(0);
  readonly totalOfferOrders = input(0);
  readonly loading = input(false);
  readonly selectedSymbol = input('Symbol');
  readonly settings = input<PriceSpectrumSettings>({
    bidBackgroundColor: 'rgba(61, 220, 151, 0.12)',
    bidRatioColor: '#3ddc97',
    offerBackgroundColor: 'rgba(255, 125, 125, 0.12)',
    offerRatioColor: '#ff7d7d',
    fontFamily: 'IBM Plex Sans, sans-serif',
    fontSize: 13
  });

  readonly bidDoubleClicked = output<PriceSpectrumRow>();
  readonly offerDoubleClicked = output<PriceSpectrumRow>();

  protected formatSideValue(quantity?: number, orders?: number): string {
    if (!quantity) {
      return '--';
    }

    return orders && orders > 0
      ? `${Math.round(quantity).toLocaleString('en-US')}(${orders})`
      : `${Math.round(quantity).toLocaleString('en-US')}`;
  }

  protected emitBid(row: PriceSpectrumRow): void {
    if (row.bidQuantity) {
      this.bidDoubleClicked.emit(row);
    }
  }

  protected emitOffer(row: PriceSpectrumRow): void {
    if (row.offerQuantity) {
      this.offerDoubleClicked.emit(row);
    }
  }
}

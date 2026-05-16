import { CommonModule, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { MarketDepthLevel } from '../../utils/market-depth.mapper';

@Component({
  selector: 'app-market-depth-book',
  standalone: true,
  imports: [CommonModule, DecimalPipe, NgClass],
  templateUrl: './market-depth-book.component.html',
  styleUrl: './market-depth-book.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketDepthBookComponent {
  readonly bids = input<readonly MarketDepthLevel[]>([]);
  readonly offers = input<readonly MarketDepthLevel[]>([]);
  readonly mode = input<'PRICE' | 'ORDER'>('PRICE');
  readonly bidColor = input('#3ddc97');
  readonly offerColor = input('#ff7d7d');
  readonly totalBidQuantity = input(0);
  readonly totalBidOrders = input(0);
  readonly totalOfferQuantity = input(0);
  readonly totalOfferOrders = input(0);
  readonly loading = input(false);
  readonly selectedSymbol = input('Symbol');

  readonly bidDoubleClicked = output<MarketDepthLevel>();
  readonly offerDoubleClicked = output<MarketDepthLevel>();

  protected readonly bidHeaders = () =>
    this.mode() === 'PRICE'
      ? ['Size', 'Accumulated', 'Split', 'Bid']
      : ['Size', 'Accumulated', 'Bid'];

  protected readonly offerHeaders = () =>
    this.mode() === 'PRICE'
      ? ['Offer', 'Split', 'Accumulated', 'Size']
      : ['Offer', 'Accumulated', 'Size'];

  protected emitBid(level: MarketDepthLevel): void {
    this.bidDoubleClicked.emit(level);
  }

  protected emitOffer(level: MarketDepthLevel): void {
    this.offerDoubleClicked.emit(level);
  }
}

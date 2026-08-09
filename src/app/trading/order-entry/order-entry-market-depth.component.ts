import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';

import { MarketDepthBookComponent } from '../../shared/components/market-depth-book/market-depth-book.component';
import { MarketDepthLevel } from '../../shared/utils/market-depth.mapper';
import { MarketDepthOrderType } from '../../shared/utils/market-depth-topic.util';
import { SharedSymbolOption } from '../../shared/utils/symbol-reference.util';
import {
  OrderEntryDepthConnectionState,
  OrderEntryMarketDepthFacade
} from './order-entry-market-depth.facade';

export interface OrderEntryDepthSelection {
  side: 'BUY' | 'SELL';
  level: MarketDepthLevel;
}

@Component({
  selector: 'app-order-entry-market-depth',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatButtonToggleModule, MarketDepthBookComponent],
  templateUrl: './order-entry-market-depth.component.html',
  styleUrl: './order-entry-market-depth.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OrderEntryMarketDepthFacade]
})
export class OrderEntryMarketDepthComponent {
  readonly symbol = input<SharedSymbolOption | null>(null);
  readonly levelSelected = output<OrderEntryDepthSelection>();

  private readonly facade = inject(OrderEntryMarketDepthFacade);
  protected readonly vm$ = this.facade.vm$;

  constructor() {
    effect(() => this.facade.selectSymbol(this.symbol()));
  }

  protected selectMboOrderType(orderType: MarketDepthOrderType): void {
    this.facade.selectMboOrderType(orderType);
  }

  protected useBid(level: MarketDepthLevel): void {
    this.levelSelected.emit({ side: 'SELL', level });
  }

  protected useOffer(level: MarketDepthLevel): void {
    this.levelSelected.emit({ side: 'BUY', level });
  }

  protected connectionLabel(state: OrderEntryDepthConnectionState): string {
    switch (state) {
      case 'CONNECTED':
        return 'Live';
      case 'CONNECTING':
        return 'Connecting';
      case 'RECONNECTING':
        return 'Reconnecting';
      case 'DISCONNECTED':
        return 'Offline';
    }
  }
}

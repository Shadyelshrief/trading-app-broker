import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketDepthBookComponent } from '../../shared/components/market-depth-book/market-depth-book.component';
import { MarketDepthLevel } from '../../shared/utils/market-depth.mapper';
import { MarketDepthOrderType } from '../../shared/utils/market-depth-topic.util';
import { displayDepthSymbol } from './market-depth-by-order.mapper';
import { MarketDepthByOrderFacade } from './market-depth-by-order.facade';
import { SymbolOption } from './market-depth-by-order.models';

@Component({
  selector: 'app-market-depth-by-order',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MarketDepthBookComponent
  ],
  templateUrl: './market-depth-by-order.component.html',
  styleUrl: './market-depth-by-order.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketDepthByOrderFacade]
})
export class MarketDepthByOrderComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(MarketDepthByOrderFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly symbolControl = new FormControl<string | SymbolOption>('IHC - International Holding Company', { nonNullable: true });

  constructor() {
    this.symbolControl.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateSymbolQuery(value);
          return;
        }

        this.facade.selectSymbol(value);
      });
  }

  protected displaySymbol = displayDepthSymbol;

  protected selectOrderType(orderType: MarketDepthOrderType): void {
    this.facade.selectOrderType(orderType);
  }

  protected openOrder(side: 'buy' | 'sell', vm: { market: string; symbolId: string; symbolName: string; currency: string }, level: MarketDepthLevel): void {
    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: `${side === 'buy' ? 'Buy' : 'Sell'} Order - ${vm.symbolId}`,
        route: `/app/trading/order-entry/${side}/${vm.market.toLowerCase()}/${vm.symbolId.toLowerCase()}`,
        section: 'trading',
        screen: 'order-entry',
        context: {
          side,
          order: {
            ...vm,
            price: level.price,
            quantity: level.size
          }
        }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { PriceSpectrumBookComponent } from '../../shared/components/price-spectrum-book/price-spectrum-book.component';
import { displayDepthSymbol } from '../market-depth-by-price/market-depth-by-price.mapper';
import { PriceSpectrumFacade } from './price-spectrum.facade';
import { PriceSpectrumRow, SymbolOption } from './price-spectrum.models';

@Component({
  selector: 'app-price-spectrum',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatFormFieldModule,
    MatInputModule,
    PriceSpectrumBookComponent
  ],
  templateUrl: './price-spectrum.component.html',
  styleUrl: './price-spectrum.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PriceSpectrumFacade]
})
export class PriceSpectrumComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(PriceSpectrumFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly symbolControl = new FormControl<string | SymbolOption>(
    'IHC - International Holding Company',
    { nonNullable: true }
  );

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

  protected openOrder(
    side: 'buy' | 'sell',
    vm: { market: string; symbolId: string; symbolName: string; currency: string },
    row: PriceSpectrumRow
  ): void {
    const price = side === 'sell' ? row.price : row.price;
    const quantity = side === 'sell' ? row.bidQuantity ?? 0 : row.offerQuantity ?? 0;

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
            price,
            quantity
          }
        }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

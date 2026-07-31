import { AsyncPipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';

import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';
import { MarketChartSeries } from '../../shared/models/market-chart.model';
import { FullMarketRow } from '../models/full-market-row.model';
import { PriceQuoteFacade } from './price-quote.facade';
import { formatRangeLabel, resolveDirectionClass } from './price-quote.mapper';
import { PriceQuoteViewModel } from './price-quote.models';

@Component({
  selector: 'app-price-quote',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgClass, ReactiveFormsModule, MatAutocompleteModule, MatFormFieldModule, MatInputModule, MarketChartComponent],
  templateUrl: './price-quote.component.html',
  styleUrl: './price-quote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PriceQuoteFacade]
})
export class PriceQuoteComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(PriceQuoteFacade);
  protected readonly vm$ = this.facade.vm$;
  protected readonly symbolControl = new FormControl<string | FullMarketRow>('IHC', { nonNullable: true });

  constructor() {
    this.symbolControl.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateSymbolQuery(value);
          return;
        }

        this.selectSymbol(value);
      });

    effect(() => {
      const state = this.state();
      this.facade.initialize(state);
      const quote = state?.context?.['quote'];

      if (quote && typeof quote === 'object' && 'symbolId' in quote && typeof quote.symbolId === 'string') {
        this.symbolControl.setValue(quote.symbolId, { emitEvent: false });
      }
    });
  }

  protected displaySymbol(value: string | FullMarketRow | null): string {
    return typeof value === 'string' ? value : value ? `${value.symbolId} - ${value.symbolName}` : '';
  }

  protected selectSymbol(symbol: FullMarketRow): void {
    this.facade.selectSymbol(symbol.symbolId);
  }

  protected chartSeries(vm: PriceQuoteViewModel): MarketChartSeries[] {
    return [
      {
        id: `${vm.market}-${vm.symbolId}`,
        label: vm.symbolId,
        points: vm.chartData.map((point) => ({
          time: point.time,
          value: point.price
        }))
      }
    ];
  }

  protected directionClass(vm: PriceQuoteViewModel): string {
    return resolveDirectionClass(vm.direction);
  }

  protected rangeLabel(value: number): string {
    return formatRangeLabel(value);
  }

  captureState() {
    return this.facade.captureState(this.state());
  }
}

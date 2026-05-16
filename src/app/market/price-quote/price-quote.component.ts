import { AsyncPipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';
import { MarketChartSeries } from '../../shared/models/market-chart.model';
import { PriceQuoteFacade } from './price-quote.facade';
import { formatRangeLabel, resolveDirectionClass } from './price-quote.mapper';
import { PriceQuoteViewModel } from './price-quote.models';

@Component({
  selector: 'app-price-quote',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgClass, MatFormFieldModule, MatSelectModule, MarketChartComponent],
  templateUrl: './price-quote.component.html',
  styleUrl: './price-quote.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [PriceQuoteFacade]
})
export class PriceQuoteComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(PriceQuoteFacade);
  protected readonly vm$ = this.facade.vm$;

  constructor() {
    effect(() => {
      this.facade.initialize(this.state());
    });
  }

  protected selectSymbol(symbolId: string): void {
    this.facade.selectSymbol(symbolId);
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

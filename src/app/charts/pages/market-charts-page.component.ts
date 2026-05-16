import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { map } from 'rxjs';

import { FullMarketFacade } from '../../market/full-market/full-market.facade';
import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';

@Component({
  selector: 'app-market-charts-page',
  standalone: true,
  imports: [AsyncPipe, MarketChartComponent],
  templateUrl: './market-charts-page.component.html',
  styleUrl: './market-charts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FullMarketFacade]
})
export class MarketChartsPageComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string }>();

  private readonly facade = inject(FullMarketFacade);

  protected readonly vm$ = this.facade.vm$.pipe(
    map((vm) => {
      const primary = vm.rows[0];

      return {
        symbol: primary?.symbolId ?? 'IHC',
        series: [
          {
            id: 'primary',
            label: primary?.symbolName ?? 'Market',
            points: vm.rows.slice(0, 20).map((row, index) => ({
              time: `${index + 1}`,
              value: row.lastPrice,
              close: row.lastPrice
            }))
          }
        ]
      };
    })
  );

  captureState() {
    return this.state();
  }
}

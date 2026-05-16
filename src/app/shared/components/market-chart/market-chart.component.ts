import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AgChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-angular';

import { MarketChartSeries, MarketChartTimeframe, MarketChartType } from '../../models/market-chart.model';

@Component({
  selector: 'app-market-chart',
  standalone: true,
  imports: [CommonModule, AgCharts, MatButtonToggleModule],
  templateUrl: './market-chart.component.html',
  styleUrl: './market-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketChartComponent {
  readonly series = input<MarketChartSeries[]>([]);
  readonly chartType = input<MarketChartType>('line');
  readonly timeframe = input<MarketChartTimeframe>('1D');
  readonly symbol = input('IHC');
  readonly realtime = input(true);

  readonly timeframeChanged = output<MarketChartTimeframe>();
  readonly indicatorChanged = output<string>();

  protected readonly timeframeOptions: readonly MarketChartTimeframe[] = ['1D', '1W', '1M', '3M', '1Y'];
  protected readonly chartOptions = computed<AgChartOptions>(() => {
    const primarySeries = this.series()[0];
    const data = primarySeries?.points ?? [];
    const resolvedChartType = this.chartType() === 'area' ? 'area' : 'line';

    return {
      autoSize: true,
      background: { fill: 'transparent' },
      legend: { enabled: false },
      title: {
        text: `${this.symbol()} ${this.chartType().toUpperCase()}`
      },
      subtitle: {
        text: this.realtime() ? 'Realtime market stream' : 'Historical market data'
      },
      axes: [
        { type: 'category', position: 'bottom', label: { color: '#88a2bf' } },
        { type: 'number', position: 'left', label: { color: '#88a2bf' } }
      ],
      series: [
        {
          type: resolvedChartType,
          xKey: 'time',
          yKey: this.chartType() === 'candlestick' || this.chartType() === 'ohlc' ? 'close' : 'value',
          yName: primarySeries?.label ?? this.symbol(),
          stroke: '#18dcc1',
          fill: 'rgba(24, 220, 193, 0.18)',
          data
        }
      ]
    };
  });

  protected onTimeframeChange(value: string): void {
    this.timeframeChanged.emit(value as MarketChartTimeframe);
  }
}

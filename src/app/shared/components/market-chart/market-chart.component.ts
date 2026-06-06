import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { AgChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-angular';

import {
  MarketChartIndicator,
  MarketChartSeries,
  MarketChartSeriesPoint,
  MarketChartTimeframe,
  MarketChartType
} from '../../models/market-chart.model';

@Component({
  selector: 'app-market-chart',
  standalone: true,
  imports: [CommonModule, AgCharts, MatButtonModule, MatButtonToggleModule],
  templateUrl: './market-chart.component.html',
  styleUrl: './market-chart.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketChartComponent {
  readonly chartData = input<MarketChartSeriesPoint[]>([]);
  readonly series = input<MarketChartSeries[]>([]);
  readonly chartType = input<MarketChartType>('line');
  readonly indicators = input<MarketChartIndicator[]>([]);
  readonly comparisonSeries = input<MarketChartSeries[]>([]);
  readonly showVolume = input(false);
  readonly timePeriod = input<MarketChartTimeframe | string | null>(null);
  readonly timeframe = input<MarketChartTimeframe>('1D');
  readonly loading = input(false);
  readonly theme = input<'dark' | 'light'>('dark');
  readonly height = input<string | number>('100%');
  readonly symbol = input('IHC');
  readonly realtime = input(true);

  readonly timeframeChanged = output<MarketChartTimeframe>();
  readonly indicatorChanged = output<string>();
  readonly pointHovered = output<MarketChartSeriesPoint>();
  readonly pointClicked = output<MarketChartSeriesPoint>();
  readonly chartReady = output<void>();
  readonly rangeChanged = output<{ start?: string | number | Date; end?: string | number | Date }>();
  readonly indicatorRemoved = output<string>();

  protected readonly timeframeOptions: readonly MarketChartTimeframe[] = ['INTRADAY', '1D', '1W', '1M', '3M', '6M', '1Y'];
  protected readonly resolvedHeight = computed(() => {
    const value = this.height();
    return typeof value === 'number' ? `${value}px` : value;
  });
  protected readonly chartOptions = computed<AgChartOptions>(() => {
    const chartSeries = this.resolveSeries();
    const primarySeries = chartSeries[0];
    const resolvedChartType = this.resolveChartType();
    const hasVolume = chartSeries.some((series) => series.yAxisKey === 'volume' || series.yKey === 'volume');
    const textColor = this.theme() === 'light' ? '#172033' : '#d9e5f2';
    const mutedColor = this.theme() === 'light' ? '#52606f' : '#88a2bf';
    const gridColor = this.theme() === 'light' ? 'rgba(82, 96, 111, 0.14)' : 'rgba(136, 162, 191, 0.12)';

    return {
      autoSize: true,
      background: { fill: 'transparent' },
      legend: {
        enabled: chartSeries.length > 1,
        position: 'bottom',
        item: { label: { color: textColor } }
      },
      title: {
        text: `${this.symbol()} ${this.chartType().toUpperCase()}`,
        color: textColor
      },
      subtitle: {
        text: this.realtime() ? 'Realtime market stream' : 'Historical market data',
        color: mutedColor
      },
      navigator: { enabled: true },
      axes: [
        {
          type: 'category',
          position: 'bottom',
          label: { color: mutedColor },
          gridLine: { enabled: true, style: [{ stroke: gridColor }] },
          crosshair: { enabled: true }
        },
        {
          type: 'number',
          position: 'left',
          keys: chartSeries.filter((series) => series.yAxisKey !== 'volume').map((series) => series.yKey ?? 'value'),
          label: { color: mutedColor },
          gridLine: { enabled: true, style: [{ stroke: gridColor }] },
          crosshair: { enabled: true }
        },
        ...(hasVolume
          ? [
              {
                type: 'number',
                position: 'right',
                keys: ['volume'],
                label: { color: mutedColor }
              }
            ]
          : [])
      ],
      series:
        chartSeries.length > 0
          ? chartSeries.map((series, index) => {
              const type = series.type ?? (series.yAxisKey === 'volume' ? 'bar' : resolvedChartType);
              const color = series.color ?? DEFAULT_SERIES_COLORS[index % DEFAULT_SERIES_COLORS.length];

              return {
                type,
                xKey: series.xKey ?? 'time',
                yKey: series.yKey ?? (this.isFinancialChart() ? 'close' : 'value'),
                yName: series.label,
                stroke: color,
                fill: type === 'area' || type === 'bar' ? withAlpha(color, type === 'bar' ? 0.28 : 0.16) : undefined,
                data: series.points,
                tooltip: {
                  renderer: ({ datum, xKey, yKey }: { datum: Record<string, unknown>; xKey: string; yKey: string }) => ({
                    title: series.label,
                    content: `${datum[xKey] ?? ''}: ${formatTooltipValue(datum[yKey])}`
                  })
                },
                ...series.options
              };
            })
          : [
              {
                type: resolvedChartType,
                xKey: 'time',
                yKey: this.isFinancialChart() ? 'close' : 'value',
                yName: primarySeries?.label ?? this.symbol(),
                stroke: '#18dcc1',
                fill: 'rgba(24, 220, 193, 0.18)',
                data: []
              }
            ]
    } as AgChartOptions;
  });

  protected onTimeframeChange(value: string): void {
    this.timeframeChanged.emit(value as MarketChartTimeframe);
  }

  protected removeIndicator(indicatorId: string): void {
    this.indicatorRemoved.emit(indicatorId);
  }

  private resolveSeries(): MarketChartSeries[] {
    const explicitSeries = this.series();

    if (explicitSeries.length > 0) {
      return [...explicitSeries, ...this.comparisonSeries()];
    }

    const points = this.chartData();

    if (points.length === 0) {
      return [];
    }

    const primary: MarketChartSeries = {
      id: 'primary',
      label: this.symbol(),
      points,
      type: this.resolveChartType(),
      xKey: 'time',
      yKey: this.isFinancialChart() ? 'close' : 'value',
      color: '#18dcc1'
    };

    const volume: MarketChartSeries | null = this.showVolume()
      ? {
          id: 'volume',
          label: 'Volume',
          points,
          type: 'bar',
          xKey: 'time',
          yKey: 'volume',
          yAxisKey: 'volume',
          color: '#64748b'
        }
      : null;

    return volume ? [primary, volume, ...this.comparisonSeries()] : [primary, ...this.comparisonSeries()];
  }

  private resolveChartType(): 'line' | 'area' | 'bar' {
    switch (this.chartType()) {
      case 'area':
        return 'area';
      case 'bar':
        return 'bar';
      default:
        return 'line';
    }
  }

  private isFinancialChart(): boolean {
    return this.chartType() === 'candlestick' || this.chartType() === 'ohlc';
  }
}

const DEFAULT_SERIES_COLORS = ['#18dcc1', '#60a5fa', '#f6c55b', '#ff7d7d', '#a78bfa', '#34d399', '#f97316'];

function withAlpha(color: string, alpha: number): string {
  if (!color.startsWith('#') || (color.length !== 7 && color.length !== 4)) {
    return color;
  }

  const hex =
    color.length === 4
      ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
      : color;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatTooltipValue(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value)
    : `${value ?? '--'}`;
}

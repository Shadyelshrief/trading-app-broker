import type { MarketChartSeries } from '../../shared/models/market-chart.model';
import type {
  ChartSeriesPoint,
  ComparisonSeries,
  IndexPerformanceRow
} from '../services/market-performance.service';
import type { TechnicalIndicatorSeries } from '../technical-indicators/indicator.models';

export function mapIndexRowsToChartData(rows: readonly IndexPerformanceRow[]): ChartSeriesPoint[] {
  return rows.map((row) => ({
    date: row.tradingDate,
    time: row.tradingDate,
    open: row.openIndex,
    high: row.highPrice,
    low: row.lowPrice,
    close: row.closingIndex,
    value: row.closingIndex,
    volume: row.volume ?? 0
  }));
}

export function buildIndexChartSeries(
  label: string,
  points: readonly ChartSeriesPoint[],
  indicators: readonly TechnicalIndicatorSeries[],
  comparisons: readonly ComparisonSeries[],
  showVolume: boolean
): MarketChartSeries[] {
  return [
    {
      id: 'base-close',
      label,
      points: points.map(toMarketChartPoint),
      type: 'line',
      xKey: 'time',
      yKey: 'close',
      color: '#18dcc1'
    },
    {
      id: 'base-open',
      label: `${label} Open`,
      points: points.map(toMarketChartPoint),
      type: 'line',
      xKey: 'time',
      yKey: 'open',
      color: '#60a5fa'
    },
    {
      id: 'base-high',
      label: `${label} High`,
      points: points.map(toMarketChartPoint),
      type: 'line',
      xKey: 'time',
      yKey: 'high',
      color: '#34d399'
    },
    {
      id: 'base-low',
      label: `${label} Low`,
      points: points.map(toMarketChartPoint),
      type: 'line',
      xKey: 'time',
      yKey: 'low',
      color: '#ff7d7d'
    },
    ...(showVolume
      ? [
          {
            id: 'volume',
            label: 'Volume',
            points: points.map(toMarketChartPoint),
            type: 'bar' as const,
            xKey: 'time',
            yKey: 'volume',
            color: '#64748b',
            yAxisKey: 'volume'
          }
        ]
      : []),
    ...comparisons.map((comparison, index) => ({
      id: `comparison-${comparison.id}`,
      label: comparison.label,
      points: comparison.points.map(toMarketChartPoint),
      type: 'line' as const,
      xKey: 'time',
      yKey: 'close',
      color: COMPARISON_COLORS[index % COMPARISON_COLORS.length]
    })),
    ...indicators.map((indicator) => ({
      id: indicator.id,
      label: indicator.label,
      points: indicator.points.map(toMarketChartPoint),
      type: indicator.label.toLowerCase().includes('volume') ? ('bar' as const) : ('line' as const),
      xKey: 'time',
      yKey: indicator.label.toLowerCase().includes('volume') ? 'volume' : 'value',
      color: indicator.color,
      yAxisKey: indicator.panel === 'SEPARATE' || indicator.label.toLowerCase().includes('volume') ? 'volume' : undefined
    }))
  ];
}

function toMarketChartPoint(point: ChartSeriesPoint) {
  return {
    time: point.time ?? point.date,
    date: point.date,
    open: point.open,
    high: point.high,
    low: point.low,
    close: point.close,
    value: point.value,
    volume: point.volume
  };
}

const COMPARISON_COLORS = ['#f6c55b', '#a78bfa', '#fb7185', '#22d3ee'];

export type MarketChartType = 'line' | 'area' | 'bar' | 'candlestick' | 'ohlc';
export type MarketChartTimeframe = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'INTRADAY' | 'CUSTOM';

export interface MarketChartSeriesPoint {
  time: string | number | Date;
  date?: string | number | Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
  volume?: number;
  [key: string]: string | number | Date | undefined;
}

export interface MarketChartSeries {
  id: string;
  label: string;
  points: MarketChartSeriesPoint[];
  type?: 'line' | 'area' | 'bar';
  xKey?: string;
  yKey?: string;
  color?: string;
  yAxisKey?: string;
  options?: Record<string, unknown>;
}

export interface MarketChartIndicator {
  id: string;
  label: string;
  color?: string;
  removable?: boolean;
}

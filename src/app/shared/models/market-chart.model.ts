export type MarketChartType = 'line' | 'area' | 'candlestick' | 'ohlc';
export type MarketChartTimeframe = '1D' | '1W' | '1M' | '3M' | '1Y';

export interface MarketChartSeriesPoint {
  time: string | number | Date;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  value?: number;
  volume?: number;
}

export interface MarketChartSeries {
  id: string;
  label: string;
  points: MarketChartSeriesPoint[];
  options?: Record<string, unknown>;
}

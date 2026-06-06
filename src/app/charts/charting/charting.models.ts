import type { MarketChartSeries } from '../../shared/models/market-chart.model';

export type ChartInstrumentType = 'SYMBOL' | 'INDEX';
export type ChartTimePeriod = 'INTRADAY' | '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'CUSTOM';
export type ChartRenderType = 'LINE' | 'CANDLESTICK' | 'AREA' | 'BAR';
export type IndicatorType =
  | 'SMA'
  | 'EMA'
  | 'RSI'
  | 'MACD'
  | 'BOLLINGER_BANDS'
  | 'MOMENTUM'
  | 'ROC'
  | 'VOLUME';
export type IndicatorPanel = 'MAIN' | 'SEPARATE';
export type DrawingTool = 'NONE' | 'TREND_LINE' | 'HORIZONTAL_LINE' | 'VERTICAL_LINE' | 'RECTANGLE' | 'TEXT' | 'ERASER';

export interface ChartPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  lastPrice?: number;
  volume?: number;
}

export interface ChartInstrument {
  id: string;
  name: string;
  type: ChartInstrumentType;
  market: string;
  currency?: string;
}

export interface TechnicalIndicatorConfig {
  id: string;
  type: IndicatorType;
  label: string;
  params: Record<string, number | string>;
  panel: IndicatorPanel;
  color?: string;
}

export interface ComparisonSeries {
  instrument: ChartInstrument;
  data: ChartPoint[];
  color?: string;
}

export interface ChartViewModel {
  selectedInstrument: ChartInstrument | null;
  instrumentOptions: readonly ChartInstrument[];
  comparisonOptions: readonly ChartInstrument[];
  timePeriod: ChartTimePeriod;
  chartType: ChartRenderType;
  chartData: ChartPoint[];
  series: MarketChartSeries[];
  indicators: TechnicalIndicatorConfig[];
  comparisonSeries: ComparisonSeries[];
  showVolume: boolean;
  comparisonEnabled: boolean;
  lineStudiesEnabled: boolean;
  activeDrawingTool: DrawingTool;
  loading: boolean;
  error?: string;
  lastPrice?: number;
  lastUpdated?: number;
}

export interface ChartDataRequest {
  instrument: ChartInstrument;
  timePeriod: ChartTimePeriod;
  fromDate?: string;
  toDate?: string;
}

export interface ChartComparisonDataRequest {
  baseInstrument: ChartInstrument;
  comparisonInstruments: readonly ChartInstrument[];
  timePeriod: ChartTimePeriod;
  fromDate?: string;
  toDate?: string;
}

export interface ChartPointEvent {
  instrument: ChartInstrument;
  point: ChartPoint;
}

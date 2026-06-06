import type { ChartSeriesPoint } from '../services/market-performance.service';

export type TechnicalIndicatorType =
  | 'SMA'
  | 'EMA'
  | 'RSI'
  | 'MACD'
  | 'BOLLINGER_BANDS'
  | 'VOLUME'
  | 'ROC'
  | 'MOMENTUM';

export interface TechnicalIndicatorConfig {
  id: string;
  type: TechnicalIndicatorType;
  label: string;
  params: Record<string, number | string>;
  color?: string;
  panel: 'MAIN' | 'SEPARATE';
}

export interface TechnicalIndicatorSeries {
  id: string;
  label: string;
  indicatorId: string;
  points: ChartSeriesPoint[];
  color?: string;
  panel: 'MAIN' | 'SEPARATE';
}

export interface IndicatorDialogData {
  existingIndicators: readonly TechnicalIndicatorConfig[];
}

export interface IndicatorDefinition {
  type: TechnicalIndicatorType;
  label: string;
  panel: 'MAIN' | 'SEPARATE';
  color: string;
  params: readonly IndicatorParamDefinition[];
}

export interface IndicatorParamDefinition {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  defaultValue: number | string;
  options?: readonly string[];
  min?: number;
}

import {
  ChartSeriesPoint,
  ComparisonSeries,
  IndexOption,
  IndexPerformanceRow,
  PerformancePeriod
} from '../services/market-performance.service';
import { TechnicalIndicatorConfig } from '../technical-indicators/indicator.models';
import { TechnicalIndicatorSeries } from '../technical-indicators/indicator.models';

export interface IndicesPerformanceViewModel {
  selectedIndex: IndexOption | null;
  selectedPeriod: PerformancePeriod;
  indexOptions: readonly IndexOption[];
  rows: readonly IndexPerformanceRow[];
  chartData: readonly ChartSeriesPoint[];
  indicators: readonly TechnicalIndicatorConfig[];
  indicatorSeries?: readonly TechnicalIndicatorSeries[];
  comparisonSeries: readonly ComparisonSeries[];
  showVolume: boolean;
  comparisonEnabled: boolean;
  loading: boolean;
  error?: string;
  validationError?: string;
}

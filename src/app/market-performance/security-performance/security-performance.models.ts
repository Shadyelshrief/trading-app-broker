import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import type {
  ChartSeriesPoint,
  ComparisonSeries,
  PerformancePeriod,
  SecurityOption,
  SecurityPerformanceRow
} from '../services/market-performance.service';
import type { TechnicalIndicatorConfig, TechnicalIndicatorSeries } from '../technical-indicators/indicator.models';

export interface SecurityPerformanceViewModel {
  selectedSecurity: SecurityOption | null;
  selectedPeriod: PerformancePeriod;
  securityOptions: SecurityOption[];
  rows: SecurityPerformanceRow[];
  chartData: ChartSeriesPoint[];
  indicators: TechnicalIndicatorConfig[];
  indicatorSeries?: TechnicalIndicatorSeries[];
  comparisonSeries: ComparisonSeries[];
  showVolume: boolean;
  comparisonEnabled: boolean;
  loading: boolean;
  settings: MarketGridSettings;
  error?: string;
  validationError?: string;
}

import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import type {
  ClientOption,
  LookupOption,
  OrderMonitoringRow,
  OrderSearchRequest,
  PortfolioOption,
  SymbolOption
} from '../services/order.models';

export interface OrderMonitoringFilters extends OrderSearchRequest {}

export interface OrderMonitoringViewModel {
  clientOptions: readonly ClientOption[];
  symbolOptions: readonly SymbolOption[];
  portfolioOptions: readonly PortfolioOption[];
  markets: readonly LookupOption[];
  statuses: readonly LookupOption[];
  rows: readonly OrderMonitoringRow[];
  loading: boolean;
  error?: string;
  lastUpdated?: number;
  settings: MarketGridSettings;
  missingFeedConfig: boolean;
}

import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import type {
  ClientOption,
  LookupOption,
  OrderStatisticsRequest,
  OrderStatisticsRow,
  PortfolioOption,
  SymbolOption
} from '../services/order.models';

export interface OrderStatisticsFilters extends OrderStatisticsRequest {}

export interface OrderStatisticsViewModel {
  clientOptions: readonly ClientOption[];
  symbolOptions: readonly SymbolOption[];
  portfolioOptions: readonly PortfolioOption[];
  markets: readonly LookupOption[];
  statusGroups: readonly LookupOption[];
  rows: readonly OrderStatisticsRow[];
  loading: boolean;
  error?: string;
  settings: MarketGridSettings;
}

import { MarketGridSettings } from '../../shared/models/market-grid.model';

export type NewsAnnouncementsMarketFilter = 'all' | 'tadawul' | 'dfm' | 'adx';
export type NewsType = 'MARKET' | 'PRODUCT' | 'BROKER';

export interface MarketOption {
  label: string;
  value: NewsAnnouncementsMarketFilter;
}

export interface SymbolOption {
  symbolId: string;
  symbolName: string;
  marketShortName: string;
  marketName: string;
}

export interface NewsAnnouncementsFilters {
  showProductNews: boolean;
  symbol?: SymbolOption | null;
  showBrokerNews: boolean;
  showMarketNews: boolean;
  market: NewsAnnouncementsMarketFilter;
  fromDate: string;
  toDate: string;
}

export interface NewsAnnouncementRow {
  id: string;
  symbolId?: string;
  symbolName?: string;
  marketName?: string;
  marketShortName?: string;
  description: string;
  date: string;
  time: string;
  url?: string;
  direction?: 'UP' | 'DOWN' | 'UNCHANGED';
  newsType: NewsType;
}

export interface NewsAnnouncementsViewModel {
  filters: NewsAnnouncementsFilters;
  marketOptions: readonly MarketOption[];
  symbolOptions: readonly SymbolOption[];
  filteredSymbolOptions: readonly SymbolOption[];
  rows: readonly NewsAnnouncementRow[];
  loading: boolean;
  error?: string;
  validationError?: string;
  lastLoadedAt?: number;
  settings: MarketGridSettings;
}

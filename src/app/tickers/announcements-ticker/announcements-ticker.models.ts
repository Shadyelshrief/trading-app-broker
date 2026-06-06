import { TickerSettings } from '../ticker-settings.models';

export interface AnnouncementTickerItem {
  id: string;
  headline: string;
  description?: string;
  market?: string;
  symbolId?: string;
  symbolName?: string;
  date?: string;
  time?: string;
  url?: string;
}

export interface AnnouncementsTickerViewModel {
  items: readonly AnnouncementTickerItem[];
  settings: TickerSettings;
  loading: boolean;
  error?: string;
  lastUpdated?: number;
}

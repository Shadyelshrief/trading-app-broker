import { NewsAnnouncementRow, NewsAnnouncementsFilters } from '../../market/news-announcements/news-announcements.models';
import { MarketTickerItem } from '../../shared/components/market-ticker/market-ticker.component';
import { TickerSettings } from '../ticker-settings.models';
import { AnnouncementTickerItem } from './announcements-ticker.models';

export function buildAnnouncementsTickerFilters(settings: TickerSettings): NewsAnnouncementsFilters {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - 7);

  return {
    showProductNews: true,
    symbol: settings.symbols?.[0]
      ? {
          symbolId: settings.symbols[0].symbolId,
          symbolName: settings.symbols[0].symbolName,
          marketShortName: settings.symbols[0].marketShortName,
          marketName: settings.symbols[0].market
        }
      : null,
    showBrokerNews: true,
    showMarketNews: true,
    market: settings.market ?? 'all',
    fromDate: toDateInputValue(from),
    toDate: toDateInputValue(now)
  };
}

export function mapNewsRowsToAnnouncementTickerItems(rows: readonly NewsAnnouncementRow[]): AnnouncementTickerItem[] {
  return rows.map((row) => ({
    id: row.id,
    headline: row.description,
    description: row.description,
    market: row.marketShortName ?? row.marketName,
    symbolId: row.symbolId,
    symbolName: row.symbolName,
    date: row.date,
    time: row.time,
    url: row.url
  }));
}

export function mapAnnouncementTickerItemToMarketTicker(item: AnnouncementTickerItem): MarketTickerItem {
  return {
    id: item.id,
    primary: item.symbolId ?? item.market ?? 'NEWS',
    secondary: item.symbolName,
    headline: item.headline,
    description: item.description,
    market: item.market,
    time: [item.date, item.time].filter(Boolean).join(' '),
    url: item.url,
    raw: item
  };
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

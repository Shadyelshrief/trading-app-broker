import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketGridSettings } from '../../shared/models/market-grid.model';
import {
  NEWS_ANNOUNCEMENTS_MARKET_OPTIONS,
  filterNewsSymbolOptions,
  getNewsSymbolOptions
} from './news-announcements.filters';
import { createNewsAnnouncementsColumns } from './news-announcements.columns';
import {
  normalizeSelectedSymbol,
  validateNewsAnnouncementsFilters
} from './news-announcements.mapper';
import {
  NewsAnnouncementsFilters,
  NewsAnnouncementsViewModel,
  SymbolOption
} from './news-announcements.models';
import { NewsAnnouncementsService } from './news-announcements.service';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  highlightColor: '#f6c55b',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'news-announcements'
};

const DEFAULT_FILTERS: NewsAnnouncementsFilters = {
  showProductNews: true,
  symbol: null,
  showBrokerNews: true,
  showMarketNews: true,
  market: 'all',
  fromDate: getDefaultFromDate(),
  toDate: getDefaultToDate()
};

const SETTINGS_STORAGE_KEY = 'news-announcements-settings-v1';

@Injectable()
export class NewsAnnouncementsFacade {
  private readonly service = inject(NewsAnnouncementsService);
  private readonly filtersSubject = new BehaviorSubject<NewsAnnouncementsFilters>(DEFAULT_FILTERS);
  private readonly symbolQuerySubject = new BehaviorSubject<string>('');
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());

  readonly vm$ = combineLatest([
    this.filtersSubject,
    this.symbolQuerySubject,
    this.settingsSubject,
    this.filtersSubject.pipe(
      switchMap((filters) => {
        const validationError = validateNewsAnnouncementsFilters(filters);

        if (validationError) {
          return of({
            rows: [],
            loading: false,
            validationError,
            error: undefined,
            lastLoadedAt: undefined
          });
        }

        return this.service.getNewsAnnouncements(filters).pipe(
          map((rows) => ({
            rows,
            loading: false,
            validationError: undefined,
            error: undefined,
            lastLoadedAt: Date.now()
          })),
          startWith({
            rows: [],
            loading: true,
            validationError: undefined,
            error: undefined,
            lastLoadedAt: undefined
          }),
          catchError((error) =>
            of({
              rows: [],
              loading: false,
              validationError: undefined,
              error:
                error instanceof Error ? error.message : 'Unable to load news and announcements.',
              lastLoadedAt: undefined
            })
          )
        );
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    )
  ]).pipe(
    map(([filters, query, settings, state]) => ({
      filters,
      marketOptions: NEWS_ANNOUNCEMENTS_MARKET_OPTIONS,
      symbolOptions: getNewsSymbolOptions(),
      filteredSymbolOptions: filterNewsSymbolOptions(query),
      rows: state.rows,
      loading: state.loading,
      error: state.error,
      validationError: state.validationError,
      lastLoadedAt: state.lastLoadedAt,
      settings
    }) satisfies NewsAnnouncementsViewModel),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly columns = createNewsAnnouncementsColumns();

  toggleProductNews(showProductNews: boolean): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      showProductNews
    });
  }

  selectSymbol(symbol: SymbolOption | null): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      symbol: normalizeSelectedSymbol(symbol)
    });
    this.symbolQuerySubject.next(symbol ? `${symbol.symbolId} - ${symbol.symbolName}` : '');
  }

  updateSymbolQuery(query: string): void {
    this.symbolQuerySubject.next(query);
  }

  toggleBrokerNews(showBrokerNews: boolean): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      showBrokerNews
    });
  }

  toggleMarketNews(showMarketNews: boolean): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      showMarketNews
    });
  }

  selectMarket(market: NewsAnnouncementsFilters['market']): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      market
    });
  }

  updateFromDate(fromDate: string): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      fromDate
    });
  }

  updateToDate(toDate: string): void {
    this.filtersSubject.next({
      ...this.filtersSubject.value,
      toDate
    });
  }

  updateSettings(patch: Partial<MarketGridSettings>): void {
    const next = { ...this.settingsSubject.value, ...patch };
    this.settingsSubject.next(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  private readStoredSettings(): MarketGridSettings {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return DEFAULT_SETTINGS;
    }

    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<MarketGridSettings>) };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

function getDefaultFromDate(): string {
  const date = new Date();
  date.setDate(1);
  return formatDateInput(date);
}

function getDefaultToDate(): string {
  return formatDateInput(new Date());
}

function formatDateInput(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

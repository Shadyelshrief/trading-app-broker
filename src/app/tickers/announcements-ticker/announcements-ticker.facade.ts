import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, map, of, shareReplay, startWith, switchMap } from 'rxjs';

import { NewsAnnouncementsService } from '../../market/news-announcements/news-announcements.service';
import {
  DEFAULT_TICKER_SETTINGS,
  TickerMarketFilter,
  TickerSettings
} from '../ticker-settings.models';
import {
  buildAnnouncementsTickerFilters,
  mapNewsRowsToAnnouncementTickerItems
} from './announcements-ticker.mapper';
import { AnnouncementsTickerViewModel } from './announcements-ticker.models';

const SETTINGS_STORAGE_KEY = 'announcements-ticker-settings-v1';

@Injectable()
export class AnnouncementsTickerFacade {
  private readonly news = inject(NewsAnnouncementsService);
  private readonly settingsSubject = new BehaviorSubject<TickerSettings>(this.readSettings());

  readonly settings$ = this.settingsSubject.asObservable();

  readonly vm$: Observable<AnnouncementsTickerViewModel> = this.settings$.pipe(
    switchMap((settings) =>
      this.news.getNewsAnnouncements(buildAnnouncementsTickerFilters(settings)).pipe(
        map((rows) => {
          const items = mapNewsRowsToAnnouncementTickerItems(rows);

          return {
            items,
            settings,
            loading: false,
            lastUpdated: Date.now()
          } satisfies AnnouncementsTickerViewModel;
        }),
        startWith({
          items: [],
          settings,
          loading: true
        } satisfies AnnouncementsTickerViewModel),
        catchError((error) =>
          of({
            items: [],
            settings,
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to load announcements ticker.'
          } satisfies AnnouncementsTickerViewModel)
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateMarket(market: TickerMarketFilter): void {
    this.updateSettings({ market });
  }

  updateSpeed(speed: number): void {
    this.updateSettings({ speed: Number.isFinite(speed) ? speed : DEFAULT_TICKER_SETTINGS.speed });
  }

  private updateSettings(patch: Partial<TickerSettings>): void {
    const next = { ...this.settingsSubject.value, ...patch };
    this.settingsSubject.next(next);
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  }

  private readSettings(): TickerSettings {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return { ...DEFAULT_TICKER_SETTINGS, market: 'all', speed: 42 };
    }

    try {
      return { ...DEFAULT_TICKER_SETTINGS, market: 'all', speed: 42, ...(JSON.parse(raw) as Partial<TickerSettings>) };
    } catch {
      return { ...DEFAULT_TICKER_SETTINGS, market: 'all', speed: 42 };
    }
  }
}

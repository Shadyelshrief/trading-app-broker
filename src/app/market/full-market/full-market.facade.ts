import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, shareReplay, startWith, switchMap } from 'rxjs';

import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { FullMarketFilters, FullMarketViewModel } from '../models/full-market-row.model';
import { MarketDataService } from '../services/market-data.service';

const DEFAULT_FILTERS: FullMarketFilters = {
  exchange: 'adx',
  sector: 'ALL',
  search: '',
  direction: 'ALL'
};

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'default'
};

const SETTINGS_STORAGE_KEY = 'full-market-settings-v1';

@Injectable()
export class FullMarketFacade {
  private readonly marketData = inject(MarketDataService);

  private readonly filtersSubject = new BehaviorSubject<FullMarketFilters>(DEFAULT_FILTERS);
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());

  readonly filters$ = this.filtersSubject.asObservable();
  readonly settings$ = this.settingsSubject.asObservable();
  readonly vm$ = combineLatest([
    this.filters$,
    this.settings$,
    this.filters$.pipe(
      map((filters) => filters.exchange),
      distinctUntilChanged(),
      switchMap((exchange) =>
        this.marketData.observeFullMarketWithConnection(exchange).pipe(startWith({ rows: [], state: null }))
      )
    )
  ]).pipe(
    map(([filters, settings, payload]) => {
      const filteredRows = payload.rows.filter((row) => {
        const matchesSector = filters.sector === 'ALL' || row.sector === filters.sector;
        const matchesDirection = filters.direction === 'ALL' || row.direction === filters.direction;
        const search = filters.search.trim().toLowerCase();
        const matchesSearch =
          search.length === 0 ||
          row.symbolId.toLowerCase().includes(search) ||
          row.symbolName.toLowerCase().includes(search);

        return matchesSector && matchesDirection && matchesSearch;
      });

      const sectors = Array.from(new Set(payload.rows.map((row) => row.sector).filter(Boolean))).sort();
      const exchanges = Array.from(new Set(payload.rows.map((row) => row.market).filter(Boolean))).sort();
      const tone =
        payload.state?.status === 'authenticated' || payload.state?.status === 'connected'
          ? 'connected'
          : payload.state?.status === 'reconnecting'
            ? 'reconnecting'
            : payload.state?.status === 'connecting' || payload.state?.status === 'authenticating'
              ? 'connecting'
              : 'disconnected';
      const lastUpdatedAt = filteredRows.reduce<number | null>(
        (latest, row) => (latest === null || row.updatedAt > latest ? row.updatedAt : latest),
        null
      );

      return {
        rows: filteredRows,
        sectors,
        exchanges,
        selectedExchange: filters.exchange,
        totalSymbols: filteredRows.length,
        loading: payload.rows.length === 0,
        connectionLabel:
          tone === 'connected'
            ? 'Realtime connected'
            : tone === 'reconnecting'
              ? 'Reconnecting...'
              : tone === 'connecting'
                ? 'Connecting...'
                : 'Disconnected',
        connectionTone: tone,
        lastUpdatedAt,
        settings
      } satisfies FullMarketViewModel & { settings: MarketGridSettings };
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateFilters(patch: Partial<FullMarketFilters>): void {
    this.filtersSubject.next({ ...this.filtersSubject.value, ...patch });
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

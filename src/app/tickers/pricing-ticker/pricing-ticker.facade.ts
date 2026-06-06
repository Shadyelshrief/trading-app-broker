import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, combineLatest, map, of, shareReplay, startWith, switchMap } from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import { WatchListService } from '../../watchlists/services/watch-list.service';
import {
  DEFAULT_TICKER_SETTINGS,
  TickerMarketFilter,
  TickerMode,
  TickerSettings,
  mapTickerConnectionLabel,
  mapTickerConnectionState
} from '../ticker-settings.models';
import {
  buildPricingTickerTopics,
  getPricingTickerSectors,
  mapPricingTickerPayloads,
  resolvePricingTickerSymbols
} from './pricing-ticker.mapper';
import { PricingTickerViewModel } from './pricing-ticker.models';

const SETTINGS_STORAGE_KEY = 'pricing-ticker-settings-v1';

@Injectable()
export class PricingTickerFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly watchLists = inject(WatchListService);
  private readonly settingsSubject = new BehaviorSubject<TickerSettings>(this.readSettings());

  readonly settings$ = this.settingsSubject.asObservable();

  readonly vm$: Observable<PricingTickerViewModel> = combineLatest([
    this.settings$,
    this.watchLists.getWatchLists(),
    this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
  ]).pipe(
    switchMap(([settings, watchLists, socketState]) => {
      const symbols = resolvePricingTickerSymbols(settings, watchLists);
      const topics = buildPricingTickerTopics(symbols);
      const connectionState = mapTickerConnectionState(socketState);

      if (topics.length === 0) {
        return of({
          items: [],
          settings,
          sectorOptions: getPricingTickerSectors(settings),
          loading: false,
          connectionState,
          connectionLabel: mapTickerConnectionLabel(connectionState)
        } satisfies PricingTickerViewModel);
      }

      return this.marketData.observeMany<unknown>(topics).pipe(
        startWith({} as Record<string, unknown>),
        map((payloads) => {
          const items = mapPricingTickerPayloads(payloads, symbols);
          const latest = items.reduce<number | undefined>(
            (current, item) => (current === undefined || item.updatedAt > current ? item.updatedAt : current),
            undefined
          );

          return {
            items,
            settings,
            sectorOptions: getPricingTickerSectors(settings),
            loading: items.length === 0 && connectionState !== 'DISCONNECTED',
            connectionState,
            connectionLabel: mapTickerConnectionLabel(connectionState),
            lastUpdated: latest
          } satisfies PricingTickerViewModel;
        }),
        catchError((error) =>
          of({
            items: [],
            settings,
            sectorOptions: getPricingTickerSectors(settings),
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to load pricing ticker feed.',
            connectionState,
            connectionLabel: mapTickerConnectionLabel(connectionState)
          } satisfies PricingTickerViewModel)
        )
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateMarket(market: TickerMarketFilter): void {
    this.updateSettings({ market, sector: 'all' });
  }

  updateSector(sector: string): void {
    this.updateSettings({ sector });
  }

  updateMode(mode: TickerMode): void {
    this.updateSettings({ mode });
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
      return { ...DEFAULT_TICKER_SETTINGS };
    }

    try {
      return { ...DEFAULT_TICKER_SETTINGS, ...(JSON.parse(raw) as Partial<TickerSettings>) };
    } catch {
      return { ...DEFAULT_TICKER_SETTINGS };
    }
  }
}

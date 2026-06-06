import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, combineLatest, map, merge, of, scan, shareReplay, startWith, switchMap } from 'rxjs';

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
  buildTradingTickerTopics,
  getTradingTickerSectors,
  mapTradePayloadToTradingTickerItems,
  mergeTradingTickerItems,
  resolveTradingTickerSymbols
} from './trading-ticker.mapper';
import { TradingTickerItem, TradingTickerViewModel } from './trading-ticker.models';

const SETTINGS_STORAGE_KEY = 'trading-ticker-settings-v1';

interface TradingTickerStreamState {
  items: TradingTickerItem[];
  loading: boolean;
  error?: string;
  lastUpdated?: number;
}

@Injectable()
export class TradingTickerFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly watchLists = inject(WatchListService);
  private readonly settingsSubject = new BehaviorSubject<TickerSettings>(this.readSettings());

  readonly settings$ = this.settingsSubject.asObservable();

  private readonly stream$ = combineLatest([this.settings$, this.watchLists.getWatchLists()]).pipe(
    switchMap(([settings, watchLists]) => {
      const symbols = resolveTradingTickerSymbols(settings, watchLists);
      const topics = buildTradingTickerTopics(settings, symbols);

      if (topics.length === 0) {
        return of<TradingTickerStreamState>({
          items: [],
          loading: false
        });
      }

      return merge(
        ...topics.map((topic) =>
          this.marketData.observe<unknown>(topic).pipe(map((payload) => ({ topic, payload })))
        )
      ).pipe(
        scan<{ topic: string; payload: unknown }, TradingTickerStreamState>(
          (state, message) => {
            const incoming = mapTradePayloadToTradingTickerItems(message.payload, message.topic, symbols);
            const items = mergeTradingTickerItems(state.items, incoming, settings.mode);
            const latest = incoming.reduce<number | undefined>(
              (current, item) => (current === undefined || item.receivedAt > current ? item.receivedAt : current),
              state.lastUpdated
            );

            return {
              items,
              loading: false,
              lastUpdated: latest
            };
          },
          {
            items: [],
            loading: true
          }
        ),
        startWith<TradingTickerStreamState>({
          items: [],
          loading: true
        }),
        catchError((error) =>
          of<TradingTickerStreamState>({
            items: [],
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to load trading ticker feed.'
          })
        )
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$ = combineLatest([
    this.settings$,
    this.stream$,
    this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
  ]).pipe(
    map(([settings, stream, socketState]) => {
      const connectionState = mapTickerConnectionState(socketState);

      return {
        items: stream.items,
        settings,
        sectorOptions: getTradingTickerSectors(settings),
        loading: stream.loading,
        error: stream.error,
        connectionState,
        connectionLabel: mapTickerConnectionLabel(connectionState),
        lastUpdated: stream.lastUpdated
      } satisfies TradingTickerViewModel;
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
      return { ...DEFAULT_TICKER_SETTINGS, mode: 'MARKET_FEED' };
    }

    try {
      return { ...DEFAULT_TICKER_SETTINGS, mode: 'MARKET_FEED', ...(JSON.parse(raw) as Partial<TickerSettings>) };
    } catch {
      return { ...DEFAULT_TICKER_SETTINGS, mode: 'MARKET_FEED' };
    }
  }
}

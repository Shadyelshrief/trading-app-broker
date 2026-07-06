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

import { MarketDataService, WebSocketState } from '../../core/market-data';
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { WatchListService } from '../services/watch-list.service';
import { createSavedWatchListColumns } from './saved-watch-list.columns';
import {
  applyWatchListTickPayloads,
  buildInitialWatchListRows,
  buildWatchListTickTopics,
  evaluateWatchListConditions,
  mapConnectionTone,
  resolveSymbolsForWatchList
} from './saved-watch-list.mapper';
import {
  SavedWatchListViewModel,
  WatchListConfig,
  WatchListRow
} from './saved-watch-list.models';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  highlightColor: '#f6c55b',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'saved-watch-list'
};

const SETTINGS_STORAGE_KEY = 'saved-watch-list-settings-v1';

@Injectable()
export class SavedWatchListFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly watchListService = inject(WatchListService);
  private readonly watchListIdSubject = new BehaviorSubject<string | null>(null);
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());

  readonly columns = createSavedWatchListColumns();

  readonly vm$ = combineLatest([
    this.watchListIdSubject,
    this.watchListService.getWatchLists(),
    this.settingsSubject
  ]).pipe(
    switchMap(([watchListId, watchLists, settings]) => {
      const config = resolveConfig(watchLists, watchListId);

      if (!config) {
        return of({
          config: null,
          rows: [],
          loading: false,
          error: 'No saved watch list is available.',
          connectionTone: 'disconnected',
          lastUpdatedAt: null,
          settings
        } satisfies SavedWatchListViewModel);
      }

      const symbols = resolveSymbolsForWatchList(config);
      const initialRows = buildInitialWatchListRows(symbols);
      const topics = buildWatchListTickTopics(symbols);

      return combineLatest([
        topics.length > 0
          ? this.marketData.observeMany<unknown>(topics).pipe(
              startWith({} as Record<string, unknown>),
              catchError((error) =>
                of({
                  __error: error instanceof Error ? error.message : 'Unable to load watch list prices.'
                } as Record<string, unknown>)
              )
            )
          : of({} as Record<string, unknown>),
        this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
      ]).pipe(
        map(([payloads, socketState]) => {
          const allRows = applyWatchListTickPayloads(initialRows, payloads);
          const conditions = config.conditions ?? [];
          const rows = allRows.filter((row) => evaluateWatchListConditions(row, conditions));
          const connectionTone = mapConnectionTone(socketState);

          return {
            config,
            rows,
            loading: allRows.every((row) => row.updatedAt === 0) && connectionTone !== 'disconnected',
            error: typeof payloads['__error'] === 'string' ? payloads['__error'] : undefined,
            connectionTone,
            lastUpdatedAt: allRows.reduce<number | null>(
              (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
              null
            ),
            settings
          } satisfies SavedWatchListViewModel;
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  openWatchList(id: string | null | undefined): void {
    this.watchListIdSubject.next(id ?? null);
  }

  deleteWatchList(id: string): void {
    this.watchListService.deleteWatchList(id).subscribe();
  }

  deleteSymbol(config: WatchListConfig, row: WatchListRow): void {
    const currentSymbols = resolveSymbolsForWatchList(config);
    const nextSymbols = currentSymbols.filter(
      (symbol) => !(symbol.marketShortName === row.marketShortName && symbol.symbolId === row.symbolId)
    );

    this.watchListService
      .updateWatchList({
        ...config,
        sourceType: 'SELECTED_SYMBOLS',
        selectedSymbols: nextSymbols,
        updatedAt: Date.now()
      })
      .subscribe();
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

function resolveConfig(watchLists: WatchListConfig[], id: string | null): WatchListConfig | null {
  if (watchLists.length === 0) {
    return null;
  }

  if (!id) {
    return watchLists[0];
  }

  return watchLists.find((list) => list.id === id) ?? watchLists[0];
}

import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  distinctUntilChanged,
  map,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { createMarketIndicesColumns } from './market-indices.columns';
import { getIndexReferencesForMarket, MARKET_INDEX_OPTIONS } from './market-indices.filters';
import {
  applyIndexPayload,
  buildIndexTopic,
  createReferenceIndexRow,
  mapConnectionState
} from './market-indices.mapper';
import { MarketIndicesConnectionState, MarketIndicesViewModel, MarketIndexRow } from './market-indices.models';

const DEFAULT_SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'market-indices'
};

const SETTINGS_STORAGE_KEY = 'market-indices-settings-v1';

interface MarketIndicesFeedState {
  rowsMap: Map<string, MarketIndexRow>;
  rows: MarketIndexRow[];
  loading: boolean;
  error?: string;
  connectionState: MarketIndicesConnectionState;
}

@Injectable()
export class MarketIndicesFacade {
  private readonly marketData = inject(MarketDataService);

  private readonly selectedMarketSubject = new BehaviorSubject<string>('all');
  private readonly settingsSubject = new BehaviorSubject<MarketGridSettings>(this.readStoredSettings());

  readonly settings$ = this.settingsSubject.asObservable();
  readonly selectedMarket$ = this.selectedMarketSubject.asObservable();
  readonly columns = createMarketIndicesColumns();

  readonly vm$ = combineLatest([this.selectedMarket$, this.settings$]).pipe(
    switchMap(([selectedMarket, settings]) => {
      const references = getIndexReferencesForMarket(selectedMarket);
      const topics = references.map((reference) => buildIndexTopic(reference));

      return combineLatest([
        topics.length > 0
          ? this.marketData.observeMany<unknown>(topics).pipe(
              startWith({} as Record<string, unknown>),
              catchError((error) =>
                of({
                  __error: error instanceof Error ? error.message : 'Unable to load market indices.'
                } as Record<string, unknown>)
              )
            )
          : of({} as Record<string, unknown>),
        this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
      ]).pipe(
        scan<readonly [Record<string, unknown>, WebSocketState | null], MarketIndicesFeedState>(
          (previous, [payloads, connection]) => {
            const nextRows = references.map((reference) => {
              const key = `${reference.exchange}:${reference.indexId}`;
              const previousRow =
                previous.rowsMap.get(key) ??
                createReferenceIndexRow(reference);
              const payload = payloads[buildIndexTopic(reference)];

              return payload === undefined ? previousRow : applyIndexPayload(previousRow, payload, reference);
            });
            const nextMap = new Map(nextRows.map((row, index) => [`${references[index].exchange}:${references[index].indexId}`, row]));
            const connectionState = mapConnectionState(connection);

            return {
              rowsMap: nextMap,
              rows: nextRows,
              loading: nextRows.length === 0 || (Object.keys(payloads).length === 0 && connectionState !== 'DISCONNECTED'),
              error: typeof payloads['__error'] === 'string' ? payloads['__error'] : undefined,
              connectionState
            };
          },
          {
            rowsMap: new Map<string, ReturnType<typeof createReferenceIndexRow>>(),
            rows: references.map((reference) => createReferenceIndexRow(reference)),
            loading: true,
            error: undefined,
            connectionState: 'CONNECTING'
          }
        ),
        map((state) => {
          const lastUpdated = state.rows.reduce<number | undefined>(
            (latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest),
            undefined
          );

          return {
            selectedMarket,
            marketOptions: [...MARKET_INDEX_OPTIONS],
            rows: state.rows,
            loading: state.loading,
            error: state.error,
            connectionState: state.connectionState,
            lastUpdated,
            settings
          } satisfies MarketIndicesViewModel & { settings: MarketGridSettings };
        })
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectMarket(market: string): void {
    if (market === this.selectedMarketSubject.value) {
      return;
    }

    this.selectedMarketSubject.next(market);
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

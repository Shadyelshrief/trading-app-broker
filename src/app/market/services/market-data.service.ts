import { Injectable, inject } from '@angular/core';
import {
  EMPTY,
  Observable,
  combineLatest,
  distinctUntilChanged,
  filter,
  map,
  pairwise,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import {
  MarketDataService as CoreMarketDataService,
  WebSocketState,
  buildTickTopic
} from '../../core/market-data';
import {
  FullMarketFeederTick,
  applyFeederTickToFullMarketRow,
  parseFullMarketFeederTick
} from '../full-market/full-market-feed.mapper';
import {
  buildFullMarketRowsFromAssets,
  buildReferenceFullMarketRows
} from '../full-market/full-market-reference.data';
import { FullMarketRow } from '../models/full-market-row.model';
import { ReferenceDataLookupsService } from '../../shared/lookups/reference-data-lookups.service';
import { MarketCacheService } from './market-cache.service';

@Injectable({ providedIn: 'root' })
export class MarketDataService {
  private readonly marketData = inject(CoreMarketDataService);
  private readonly cache = inject(MarketCacheService);
  private readonly referenceData = inject(ReferenceDataLookupsService);

  observeFullMarket(exchange: string): Observable<FullMarketRow[]> {
    const normalizedExchange = exchange.trim().toLowerCase();
    const referenceRows$ = this.referenceData.getAssetsByMarket(normalizedExchange).pipe(
      map((assets) => {
        const rows = buildFullMarketRowsFromAssets(normalizedExchange, assets);
        return rows.length > 0 ? rows : buildReferenceFullMarketRows(normalizedExchange);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    const summary$ = combineLatest([
      referenceRows$,
      this.observeConnectionState().pipe(startWith(null))
    ]).pipe(
      map(([referenceRows]) => this.cache.replaceFullMarket(referenceRows)),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    const tickUpdates$ = summary$.pipe(
      map((rows) => rows.map((row) => buildTickTopic(row.market, row.symbolId))),
      map((topics) => Array.from(new Set(topics))),
      distinctUntilChanged(areTopicsEqual),
      switchMap((topics) => {
        if (topics.length === 0) {
          return EMPTY.pipe(startWith([] as Array<{ topic: string; tick: FullMarketFeederTick }>));
        }

        return this.marketData.observeMany<unknown>(topics).pipe(
          startWith({} as Record<string, unknown>),
          pairwise(),
          map(([previous, current]) =>
            topics
              .filter((topic) => current[topic] !== undefined && previous[topic] !== current[topic])
              .map((topic) => parseTickUpdate(topic, current[topic]))
              .filter((update): update is { topic: string; tick: FullMarketFeederTick } => update !== null)
          ),
          startWith([] as Array<{ topic: string; tick: FullMarketFeederTick }>)
        );
      })
    );

    return combineLatest([
      summary$.pipe(startWith([] as FullMarketRow[])),
      tickUpdates$.pipe(startWith([] as Array<{ topic: string; tick: FullMarketFeederTick }>))
    ]).pipe(
      map(([rows, updates]) => {
        if (updates.length === 0) {
          return rows;
        }

        updates.forEach(({ tick }) => {
          if (!tick.symbolId) {
            return;
          }

          this.cache.updateFullMarketRow(tick.exchange ?? normalizedExchange, tick.symbolId, (currentRow) =>
            applyFeederTickToFullMarketRow(currentRow, tick)
          );
        });

        return this.cache.snapshot();
      }),
      distinctUntilChanged(haveRowsChanged),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  observeConnectionState(): Observable<WebSocketState> {
    return this.marketData.getConnectionState().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }

  observeFullMarketWithConnection(exchange: string): Observable<{
    rows: FullMarketRow[];
    state: WebSocketState | null;
  }> {
    return combineLatest([
      this.observeFullMarket(exchange).pipe(startWith([] as FullMarketRow[])),
      this.observeConnectionState().pipe(startWith(null))
    ]).pipe(map(([rows, state]) => ({ rows, state })));
  }
}

function parseTickUpdate(topic: string, payload: unknown): { topic: string; tick: FullMarketFeederTick } | null {
  const tick = parseFullMarketFeederTick(payload, topic);

  if (!tick) {
    return null;
  }

  return { topic, tick };
}

function areTopicsEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((topic, index) => topic === right[index]);
}

function haveRowsChanged(left: FullMarketRow[], right: FullMarketRow[]): boolean {
  return (
    left.length === right.length &&
    left.every(
      (row, index) =>
        row.symbolId === right[index]?.symbolId &&
        row.market === right[index]?.market &&
        row.updatedAt === right[index]?.updatedAt
    )
  );
}

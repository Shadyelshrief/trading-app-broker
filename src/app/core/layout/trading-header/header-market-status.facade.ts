import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, combineLatest, distinctUntilChanged, map, shareReplay, startWith, switchMap, timer } from 'rxjs';

import { MarketDataService, WebSocketState, normalizeTopic } from '../../market-data';
import { CrossWindowWorkspaceService } from '../workspace/cross-window-workspace.service';

import {
  HeaderMarketOption,
  HeaderMarketStatusViewModel
} from './header-market-status.models';
import {
  createEmptyHeaderMarketStatusSnapshot,
  formatMarketDate,
  formatMarketTime,
  mapConnectionLabel,
  mapConnectionTone,
  mapHeaderMarketStatus,
  withDerivedMarketStatus
} from './header-market-status.mapper';

const HEADER_MARKETS: readonly HeaderMarketOption[] = [
  {
    id: 'adx',
    label: 'ADX',
    timeZone: 'Asia/Dubai',
    indexes: [
      { id: 'fadx15', label: 'FADX 15' },
      { id: 'adi', label: 'ADX General' }
    ]
  },
  {
    id: 'dfm',
    label: 'DFM',
    timeZone: 'Asia/Dubai',
    indexes: [
      { id: 'dfmgi', label: 'DFM General' },
      { id: 'dfmgiall', label: 'DFM All Shares' }
    ]
  }
] as const;

const WORKSPACE_MARKET_KEY = 'broker-workspace-market-v1';
const WORKSPACE_INDEX_KEY = 'broker-workspace-index-v1';

@Injectable({ providedIn: 'root' })
export class HeaderMarketStatusFacade {
  private readonly marketData = inject(MarketDataService);
  private readonly crossWindow = inject(CrossWindowWorkspaceService);

  private readonly selectedMarketSubject = new BehaviorSubject<string>(readStoredMarket());
  private readonly selectedIndexSubject = new BehaviorSubject<string>(readStoredIndex(this.selectedMarketSubject.value));

  readonly selectedMarket$ = this.selectedMarketSubject.asObservable();
  readonly selectedIndex$ = this.selectedIndexSubject.asObservable();

  constructor() {
    this.crossWindow.observe<string>('MARKET_CHANGED').subscribe((message) => {
      if (typeof message.payload === 'string') {
        this.selectMarket(message.payload, false);
      }
    });
    this.crossWindow.observe<string>('INDEX_CHANGED').subscribe((message) => {
      if (typeof message.payload === 'string') {
        this.selectIndex(message.payload, false);
      }
    });
  }

  readonly vm$ = combineLatest([
    this.selectedMarket$,
    this.selectedIndex$,
    timer(0, 1000),
    this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null)),
    combineLatest([this.selectedMarket$, this.selectedIndex$]).pipe(
      distinctUntilChanged(
        ([leftMarket, leftIndex], [rightMarket, rightIndex]) =>
          leftMarket === rightMarket && leftIndex === rightIndex
      ),
      switchMap(([market, indexId]) => {
        const topics = [
          normalizeTopic(`market:${market}:status`),
          normalizeTopic(`market:${market}:summary`),
          normalizeTopic(`market:${market}:index:${indexId}`)
        ];

        return this.marketData.observeMany<unknown>(topics).pipe(
          startWith({} as Record<string, unknown>),
          map((payloads) => ({
            statusPayload: payloads[topics[0]],
            summaryPayload: payloads[topics[1]],
            indexPayload: payloads[topics[2]]
          }))
        );
      })
    )
  ]).pipe(
    map(([market, indexId, _, state, payloads]) => {
      const selectedMarket = HEADER_MARKETS.find((option) => option.id === market) ?? HEADER_MARKETS[0];
      const indexes = selectedMarket.indexes;
      const selectedIndex = indexes.find((index) => index.id === indexId)?.id ?? indexes[0]?.id ?? '';
      const now = new Date();
      const connectionTone = mapConnectionTone(state);
      const rawSnapshot = mapHeaderMarketStatus(
        payloads.summaryPayload,
        payloads.statusPayload,
        payloads.indexPayload
      );
      const snapshot = withDerivedMarketStatus(rawSnapshot, {
        hasSummaryPayload: payloads.summaryPayload !== undefined,
        hasIndexPayload: payloads.indexPayload !== undefined,
        connectionTone
      });

      return {
        markets: HEADER_MARKETS,
        indexes,
        selectedMarket: selectedMarket.id,
        selectedIndex,
        marketTime: formatMarketTime(now, selectedMarket.timeZone),
        marketDate: formatMarketDate(now, selectedMarket.timeZone),
        connectionLabel: mapConnectionLabel(connectionTone),
        connectionTone,
        ...createEmptyHeaderMarketStatusSnapshot(),
        ...snapshot
      } satisfies HeaderMarketStatusViewModel;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectMarket(marketId: string, broadcast = true): void {
    const market = HEADER_MARKETS.find((option) => option.id === marketId);

    if (!market) {
      return;
    }

    this.selectedMarketSubject.next(market.id);

    const currentIndex = this.selectedIndexSubject.value;
    const indexStillValid = market.indexes.some((index) => index.id === currentIndex);

    if (!indexStillValid) {
      this.selectedIndexSubject.next(market.indexes[0]?.id ?? '');
    }

    writeStoredContext(market.id, this.selectedIndexSubject.value);

    if (broadcast) {
      this.crossWindow.publish('MARKET_CHANGED', market.id);
      this.crossWindow.publish('INDEX_CHANGED', this.selectedIndexSubject.value);
    }
  }

  selectIndex(indexId: string, broadcast = true): void {
    if (!indexId) {
      return;
    }

    this.selectedIndexSubject.next(indexId);
    writeStoredContext(this.selectedMarketSubject.value, indexId);
    if (broadcast) {
      this.crossWindow.publish('INDEX_CHANGED', indexId);
    }
  }

  getCurrentContext(): { market: string; index: string } {
    return {
      market: this.selectedMarketSubject.value,
      index: this.selectedIndexSubject.value
    };
  }

  restoreContext(market?: string, index?: string): void {
    if (market) {
      this.selectMarket(market, false);
    }
    if (index) {
      this.selectIndex(index, false);
    }
  }
}

function readStoredMarket(): string {
  const value = readStorage(WORKSPACE_MARKET_KEY);
  return HEADER_MARKETS.some((market) => market.id === value) ? value! : HEADER_MARKETS[0].id;
}

function readStoredIndex(marketId: string): string {
  const market = HEADER_MARKETS.find((option) => option.id === marketId) ?? HEADER_MARKETS[0];
  const value = readStorage(WORKSPACE_INDEX_KEY);
  return market.indexes.some((index) => index.id === value) ? value! : market.indexes[0]?.id ?? '';
}

function writeStoredContext(market: string, index: string): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(WORKSPACE_MARKET_KEY, market);
    localStorage.setItem(WORKSPACE_INDEX_KEY, index);
  } catch {
    // Cross-window BroadcastChannel still synchronizes when storage is unavailable.
  }
}

function readStorage(key: string): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  catchError,
  combineLatest,
  map,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketDataService, WebSocketState, normalizeTopic } from '../../core/market-data';

import { MARKET_SUMMARY_MARKETS, MarketSummaryViewModel } from './market-summary.models';
import {
  appendIndexPoint,
  createDefaultParticipantStatistics,
  formatStatusLabel,
  mapConnectionLabel,
  mapConnectionState,
  mapMarketSummarySnapshot
} from './market-summary.mapper';

@Injectable()
export class MarketSummaryFacade {
  private readonly marketData = inject(MarketDataService);

  private readonly selectedMarketSubject = new BehaviorSubject<string>(MARKET_SUMMARY_MARKETS[0].id);

  readonly markets = MARKET_SUMMARY_MARKETS;
  readonly selectedMarket$ = this.selectedMarketSubject.asObservable();
  readonly vm$ = this.selectedMarket$.pipe(
    switchMap((selectedMarket) => {
      const market = this.markets.find((candidate) => candidate.id === selectedMarket) ?? this.markets[0];
      const topics = [
        normalizeTopic(`market:${market.id}:summary`),
        normalizeTopic(`market:${market.id}:status`),
        normalizeTopic(`market:${market.id}:index:${market.primaryIndex.id}`)
      ];

      return combineLatest([
        this.marketData.observeMany<unknown>(topics).pipe(
          startWith({} as Record<string, unknown>),
          catchError((error) =>
            of({
              __error: error instanceof Error ? error.message : 'Unable to load market summary.'
            } as Record<string, unknown>)
          )
        ),
        this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
      ]).pipe(
        scan<readonly [Record<string, unknown>, WebSocketState | null], MarketSummaryViewModel>(
          (previousVm, [payloads, connectionState]) => {
            const summaryPayload = payloads[topics[0]];
            const statusPayload = payloads[topics[1]];
            const indexPayload = payloads[topics[2]];
            const connection = mapConnectionState(connectionState);
            const snapshot = mapMarketSummarySnapshot(
              summaryPayload,
              statusPayload,
              indexPayload,
              market.primaryIndex.label
            );
            const hasPayload =
              summaryPayload !== undefined || statusPayload !== undefined || indexPayload !== undefined;
            const resolvedStatus =
              snapshot.marketStatus ?? (connection === 'CONNECTED' && hasPayload ? 'OPENED' : 'CLOSED');

            return {
              markets: this.markets,
              selectedMarket: market.id,
              indexName: snapshot.indexName,
              marketStatus: resolvedStatus,
              statusLabel: formatStatusLabel(resolvedStatus),
              indexCurrentValue: snapshot.indexCurrentValue ?? 0,
              change: snapshot.change ?? 0,
              changePercent: snapshot.changePercent ?? 0,
              changeDirection: snapshot.changeDirection,
              totalTrades: snapshot.totalTrades ?? 0,
              totalVolume: snapshot.totalVolume ?? 0,
              turnover: snapshot.turnover ?? 0,
              chartData: appendIndexPoint(previousVm.chartData, snapshot, market.timeZone),
              symbolsSummary: {
                traded: snapshot.symbolsSummary.traded ?? 0,
                up: snapshot.symbolsSummary.up ?? 0,
                down: snapshot.symbolsSummary.down ?? 0,
                unchanged: snapshot.symbolsSummary.unchanged ?? 0
              },
              statistics: snapshot.statistics.length > 0 ? snapshot.statistics : createDefaultParticipantStatistics(),
              connectionState: connection,
              connectionLabel: mapConnectionLabel(connection),
              lastUpdated: snapshot.lastUpdated ?? previousVm.lastUpdated,
              loading: !hasPayload && connection !== 'DISCONNECTED',
              hasLiveSummary: hasPayload,
              hasStatistics: true,
              error: typeof payloads['__error'] === 'string' ? payloads['__error'] : undefined
            };
          },
          createInitialVm(market.id, market.primaryIndex.label, this.markets)
        ),
        startWith(createInitialVm(market.id, market.primaryIndex.label, this.markets))
      );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  selectMarket(marketId: string): void {
    const market = this.markets.find((candidate) => candidate.id === marketId);

    if (!market || market.id === this.selectedMarketSubject.value) {
      return;
    }

    this.selectedMarketSubject.next(market.id);
  }
}

function createInitialVm(
  marketId: string,
  indexName: string,
  markets: typeof MARKET_SUMMARY_MARKETS
): MarketSummaryViewModel {
  return {
    markets,
    selectedMarket: marketId,
    indexName,
    marketStatus: 'CLOSED',
    statusLabel: 'Closed',
    indexCurrentValue: 0,
    change: 0,
    changePercent: 0,
    changeDirection: 'UNCHANGED',
    totalTrades: 0,
    totalVolume: 0,
    turnover: 0,
    chartData: [],
    symbolsSummary: {
      traded: 0,
      up: 0,
      down: 0,
      unchanged: 0
    },
    statistics: createDefaultParticipantStatistics(),
    connectionState: 'CONNECTING',
    connectionLabel: 'Connecting',
    lastUpdated: 0,
    loading: true,
    hasLiveSummary: false,
    hasStatistics: true,
    error: undefined
  };
}

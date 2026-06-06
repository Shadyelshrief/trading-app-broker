import { Injectable, inject } from '@angular/core';
import { Observable, combineLatest, map, shareReplay, startWith } from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { createExecutionTickerColumns } from './execution-ticker.columns';
import { ExecutionTickerFeedService } from './execution-ticker-feed.service';
import {
  mapExecutionConnectionLabel,
  mapExecutionConnectionState
} from './execution-ticker.mapper';
import { ExecutionTickerStore } from './execution-ticker.store';
import { ExecutionTickerViewModel } from './execution-ticker.models';

const EXECUTION_TICKER_SETTINGS: MarketGridSettings = {
  autoScroll: true,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'execution-ticker'
};

@Injectable()
export class ExecutionTickerFacade {
  private readonly store = inject(ExecutionTickerStore);
  private readonly marketData = inject(MarketDataService);
  private readonly feed = inject(ExecutionTickerFeedService);

  readonly columns = createExecutionTickerColumns();

  readonly vm$: Observable<ExecutionTickerViewModel> = combineLatest([
    this.store.state$,
    this.marketData.getConnectionState().pipe(startWith(null as WebSocketState | null))
  ]).pipe(
    map(([state, socketState]) => {
      const connectionState = mapExecutionConnectionState(socketState);
      const feedConfig = this.feed.resolveFeedConfig();
      const missingFeedConfig = feedConfig.topics.length === 0;

      return {
        rows: state.rows,
        loading: state.loading,
        error: state.error ?? (missingFeedConfig ? 'No authorized private execution feed topic is configured for this session.' : undefined),
        connectionState,
        connectionLabel: mapExecutionConnectionLabel(connectionState),
        lastUpdated: state.lastUpdated,
        settings: EXECUTION_TICKER_SETTINGS
      } satisfies ExecutionTickerViewModel;
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  start(): void {
    this.store.start();
  }
}

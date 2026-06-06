import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  combineLatest,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import {
  applyTickMapToPortfolioRows,
  buildPortfolioTickTopics,
  calculatePortfolioTotals
} from './portfolio-positioning.mapper';
import { PortfolioPositioningService } from './portfolio-positioning.service';
import type {
  ClientOption,
  PortfolioOption,
  PortfolioPositionRow,
  PortfolioPositioningViewModel
} from './portfolio-positioning.models';

interface PortfolioPositioningState {
  selectedClient: ClientOption | null;
  selectedPortfolioId: string | null;
  refreshKey: number;
  validationError?: string;
}

const DEFAULT_SOCKET_STATE: WebSocketState = {
  status: 'disconnected',
  reconnectAttempt: 0,
  connectedAt: null,
  authenticatedAt: null,
  lastMessageAt: null,
  lastError: null
};

@Injectable()
export class PortfolioPositioningFacade {
  private readonly service = inject(PortfolioPositioningService);
  private readonly marketData = inject(MarketDataService);
  private readonly stateSubject = new BehaviorSubject<PortfolioPositioningState>({
    selectedClient: null,
    selectedPortfolioId: null,
    refreshKey: 0
  });
  private readonly clientQuerySubject = new BehaviorSubject('');
  private readonly settings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'portfolio-positioning'
  };

  readonly clientOptions$ = this.clientQuerySubject.pipe(
    debounceTime(250),
    distinctUntilChanged(),
    switchMap((query) => this.service.searchClients(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly portfolioOptions$ = this.stateSubject.pipe(
    map((state) => state.selectedClient?.clientId ?? ''),
    distinctUntilChanged(),
    switchMap((clientId) =>
      clientId ? this.service.getClientPortfolios(clientId).pipe(catchError(() => of([]))) : of<PortfolioOption[]>([])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$: Observable<PortfolioPositioningViewModel> = combineLatest([
    this.stateSubject,
    this.clientOptions$,
    this.portfolioOptions$,
    this.marketData.getConnectionState().pipe(startWith(DEFAULT_SOCKET_STATE))
  ]).pipe(
    switchMap(([state, clientOptions, portfolioOptions, connectionState]) => {
      const selectedPortfolio =
        portfolioOptions.find((portfolio) => portfolio.portfolioId === state.selectedPortfolioId) ?? null;

      if (!state.selectedClient || !selectedPortfolio) {
        return of(
          this.createViewModel({
            state,
            clientOptions,
            portfolioOptions,
            selectedPortfolio,
            rows: [],
            connectionState,
            validationError: state.validationError
          })
        );
      }

      return this.service
        .getPortfolioPositioning({
          clientId: state.selectedClient.clientId,
          portfolioId: selectedPortfolio.portfolioId
        })
        .pipe(
          switchMap((baseRows) => this.observeRowsWithLivePrices(baseRows)),
          map((rows) =>
            this.createViewModel({
              state,
              clientOptions,
              portfolioOptions,
              selectedPortfolio,
              rows,
              connectionState
            })
          ),
          startWith(
            this.createViewModel({
              state,
              clientOptions,
              portfolioOptions,
              selectedPortfolio,
              rows: [],
              connectionState,
              loading: true
            })
          ),
          catchError((error) =>
            of(
              this.createViewModel({
                state,
                clientOptions,
                portfolioOptions,
                selectedPortfolio,
                rows: [],
                connectionState,
                error: error instanceof Error ? error.message : 'Unable to load portfolio positioning.'
              })
            )
          )
        );
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateClientQuery(query: string): void {
    this.clientQuerySubject.next(query);
  }

  selectClient(client: ClientOption): void {
    this.stateSubject.next({
      selectedClient: client,
      selectedPortfolioId: null,
      refreshKey: Date.now(),
      validationError: undefined
    });
  }

  selectPortfolio(portfolioId: string): void {
    this.patch({ selectedPortfolioId: portfolioId, refreshKey: Date.now(), validationError: undefined });
  }

  refresh(): void {
    const state = this.stateSubject.value;

    if (!state.selectedClient) {
      this.patch({ validationError: 'Client is required.' });
      return;
    }

    if (!state.selectedPortfolioId) {
      this.patch({ validationError: 'Portfolio is required.' });
      return;
    }

    this.patch({ refreshKey: Date.now(), validationError: undefined });
  }

  private observeRowsWithLivePrices(baseRows: readonly PortfolioPositionRow[]): Observable<PortfolioPositionRow[]> {
    const topics = buildPortfolioTickTopics(baseRows);

    if (topics.length === 0) {
      return of([...baseRows]);
    }

    return this.marketData.observeMany<unknown>(topics).pipe(
      startWith({} as Record<string, unknown>),
      map((tickMap) => applyTickMapToPortfolioRows(baseRows, tickMap))
    );
  }

  private createViewModel(options: {
    state: PortfolioPositioningState;
    clientOptions: readonly ClientOption[];
    portfolioOptions: readonly PortfolioOption[];
    selectedPortfolio: PortfolioOption | null;
    rows: readonly PortfolioPositionRow[];
    connectionState: WebSocketState;
    loading?: boolean;
    error?: string;
    validationError?: string;
  }): PortfolioPositioningViewModel {
    return {
      clientOptions: options.clientOptions,
      selectedClient: options.state.selectedClient,
      portfolioOptions: options.portfolioOptions,
      selectedPortfolio: options.selectedPortfolio,
      rows: options.rows,
      totals: calculatePortfolioTotals(options.rows),
      loading: options.loading ?? false,
      error: options.error,
      validationError: options.validationError,
      connectionState: options.connectionState,
      lastUpdated: options.rows.length ? Math.max(...options.rows.map((row) => row.updatedAt)) : undefined,
      settings: this.settings
    };
  }

  private patch(patch: Partial<PortfolioPositioningState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch
    });
  }
}

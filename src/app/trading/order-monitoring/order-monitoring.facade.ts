import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  merge,
  of,
  scan,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import { applyOrderEventToRows } from '../services/order.mapper';
import { OrderFeedService } from '../services/order-feed.service';
import { OrderPermissionService } from '../services/order-permission.service';
import { OrderService } from '../services/order.service';
import type { ClientOption, OrderActionResult, OrderMonitoringRow, SymbolOption } from '../services/order.models';
import { cleanOrderMonitoringFilters } from './order-monitoring.mapper';
import type { OrderMonitoringFilters, OrderMonitoringViewModel } from './order-monitoring.models';

const SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'order-monitoring'
};

@Injectable()
export class OrderMonitoringFacade {
  private readonly service = inject(OrderService);
  private readonly feed = inject(OrderFeedService);
  readonly permissions = inject(OrderPermissionService);
  private readonly filtersSubject = new BehaviorSubject<OrderMonitoringFilters>({});
  private readonly clientQuerySubject = new BehaviorSubject('');
  private readonly symbolQuerySubject = new BehaviorSubject('');
  private readonly searchTriggerSubject = new BehaviorSubject(0);
  private readonly selectedClientSubject = new BehaviorSubject<ClientOption | null>(null);
  readonly clientOptions$ = this.clientQuerySubject.pipe(
    debounceTime(220),
    distinctUntilChanged(),
    switchMap((query) => this.service.searchClients(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly symbolOptions$ = this.symbolQuerySubject.pipe(
    debounceTime(220),
    distinctUntilChanged(),
    switchMap((query) => this.service.searchSymbols(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly portfolioOptions$ = this.selectedClientSubject.pipe(
    switchMap((client) => client ? this.service.getClientPortfolios(client.clientId).pipe(catchError(() => of([]))) : of([])),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly lookups$ = this.service.getOrderLookups().pipe(catchError(() => of(null)), shareReplay({ bufferSize: 1, refCount: true }));
  readonly rows$ = this.searchTriggerSubject.pipe(
    switchMap(() =>
      this.service.searchOrders(cleanOrderMonitoringFilters(this.filtersSubject.value)).pipe(
        switchMap((rows) =>
          merge(
            of({ type: 'snapshot' as const, rows }),
            this.feed.observeOrders().pipe(map((event) => ({ type: 'event' as const, event })))
          ).pipe(
            scan((currentRows, update) => update.type === 'snapshot' ? update.rows : applyOrderEventToRows(currentRows, update.event), [] as readonly OrderMonitoringRow[])
          )
        ),
        catchError(() => of([]))
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly vm$: Observable<OrderMonitoringViewModel> = this.rows$.pipe(
    switchMap((rows) =>
      this.clientOptions$.pipe(
        switchMap((clientOptions) =>
          this.symbolOptions$.pipe(
            switchMap((symbolOptions) =>
              this.portfolioOptions$.pipe(
                switchMap((portfolioOptions) =>
                  this.lookups$.pipe(
                    map((lookups) => ({
                      clientOptions,
                      symbolOptions,
                      portfolioOptions,
                      markets: lookups?.markets ?? [],
                      statuses: lookups?.statuses ?? [],
                      rows,
                      loading: false,
                      lastUpdated: rows.length ? Math.max(...rows.map((row) => row.updatedAt)) : undefined,
                      settings: SETTINGS,
                      missingFeedConfig: this.feed.resolveFeedConfig().topics.length === 0
                    }))
                  )
                )
              )
            )
          )
        )
      )
    ),
    startWith({
      clientOptions: [],
      symbolOptions: [],
      portfolioOptions: [],
      markets: [],
      statuses: [],
      rows: [],
      loading: true,
      settings: SETTINGS,
      missingFeedConfig: this.feed.resolveFeedConfig().topics.length === 0
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateClientQuery(query: string): void {
    this.clientQuerySubject.next(query);
  }

  updateSymbolQuery(query: string): void {
    this.symbolQuerySubject.next(query);
  }

  selectClient(client: ClientOption | null): void {
    this.selectedClientSubject.next(client);
    this.patchFilters({ clientId: client?.clientId, portfolioId: undefined });
  }

  selectSymbol(symbol: SymbolOption | null): void {
    this.patchFilters({ symbolId: symbol?.symbolId, market: symbol?.market });
  }

  patchFilters(filters: OrderMonitoringFilters): void {
    this.filtersSubject.next({ ...this.filtersSubject.value, ...filters });
  }

  search(): void {
    this.searchTriggerSubject.next(Date.now());
  }

  reset(): void {
    this.filtersSubject.next({});
    this.selectedClientSubject.next(null);
    this.searchTriggerSubject.next(Date.now());
  }

  cancel(row: OrderMonitoringRow, password?: string): Observable<OrderActionResult> {
    return this.service.cancelOrder({ orderNumber: row.orderNumber, password });
  }

  suspend(row: OrderMonitoringRow): Observable<OrderActionResult> {
    return this.service.suspendOrder({ orderNumber: row.orderNumber });
  }

  activate(row: OrderMonitoringRow): Observable<OrderActionResult> {
    return this.service.activateOrder({ orderNumber: row.orderNumber });
  }
}

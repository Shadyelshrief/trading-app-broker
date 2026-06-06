import { Injectable, inject } from '@angular/core';
import {
  BehaviorSubject,
  Observable,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  shareReplay,
  startWith,
  switchMap
} from 'rxjs';

import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import { OrderService } from '../services/order.service';
import type { ClientOption, SymbolOption } from '../services/order.models';
import { cleanOrderStatisticsFilters } from './order-statistics.mapper';
import type { OrderStatisticsFilters, OrderStatisticsViewModel } from './order-statistics.models';

const SETTINGS: MarketGridSettings = {
  autoScroll: false,
  bidColor: '#3ddc97',
  offerColor: '#ff7d7d',
  fontSize: 13,
  fontFamily: 'IBM Plex Sans, sans-serif',
  theme: 'dark',
  presetId: 'order-statistics'
};

@Injectable()
export class OrderStatisticsFacade {
  private readonly service = inject(OrderService);
  private readonly filtersSubject = new BehaviorSubject<OrderStatisticsFilters>({});
  private readonly clientQuerySubject = new BehaviorSubject('');
  private readonly symbolQuerySubject = new BehaviorSubject('');
  private readonly selectedClientSubject = new BehaviorSubject<ClientOption | null>(null);
  private readonly searchTriggerSubject = new BehaviorSubject(0);

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
    switchMap(() => this.service.getOrderStatistics(cleanOrderStatisticsFilters(this.filtersSubject.value)).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  readonly vm$: Observable<OrderStatisticsViewModel> = this.rows$.pipe(
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
                      statusGroups: lookups?.statusGroups ?? [],
                      rows,
                      loading: false,
                      settings: SETTINGS
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
      statusGroups: [],
      rows: [],
      loading: true,
      settings: SETTINGS
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

  patchFilters(filters: OrderStatisticsFilters): void {
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
}

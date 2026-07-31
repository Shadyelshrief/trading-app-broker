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
  switchMap,
  tap
} from 'rxjs';

import { OrderService } from '../services/order.service';
import type {
  CashAccountOption,
  ClientOption,
  OrderActionResult,
  OrderEntryForm,
  PortfolioOption,
  SymbolOption
} from '../services/order.models';
import type { OrderEntryViewModel } from './order-entry.models';

interface OrderEntryState {
  selectedClient: ClientOption | null;
  selectedMarket: string | null;
  selectedPortfolioId: string | null;
  selectedSymbol: SymbolOption | null;
  calculation: OrderEntryViewModel['calculation'];
  lastResult: OrderActionResult | null;
  warning?: string;
  error?: string;
}

@Injectable()
export class OrderEntryFacade {
  private readonly service = inject(OrderService);
  private readonly stateSubject = new BehaviorSubject<OrderEntryState>({
    selectedClient: null,
    selectedMarket: null,
    selectedPortfolioId: null,
    selectedSymbol: null,
    calculation: null,
    lastResult: null
  });
  private readonly clientQuerySubject = new BehaviorSubject('');
  private readonly symbolQuerySubject = new BehaviorSubject('');

  readonly clientOptions$ = this.clientQuerySubject.pipe(
    debounceTime(220),
    distinctUntilChanged(),
    switchMap((query) => this.service.searchClients(query).pipe(catchError(() => of([])))),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly symbolOptions$ = combineLatest([
    this.symbolQuerySubject.pipe(debounceTime(160), distinctUntilChanged()),
    this.stateSubject.pipe(
      map((state) => state.selectedMarket ?? ''),
      distinctUntilChanged()
    )
  ]).pipe(
    switchMap(([query, market]) =>
      query.trim() && market
        ? this.service.searchSymbols(query, market).pipe(catchError(() => of([])))
        : of([])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly lookups$ = this.service.getOrderLookups().pipe(
    catchError(() => of(null)),
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

  readonly cashAccountOptions$ = this.stateSubject.pipe(
    map((state) => ({
      clientId: state.selectedClient?.clientId ?? '',
      portfolioId: state.selectedPortfolioId ?? ''
    })),
    distinctUntilChanged((a, b) => a.clientId === b.clientId && a.portfolioId === b.portfolioId),
    switchMap(({ clientId, portfolioId }) =>
      clientId && portfolioId
        ? this.service.getClientCashAccounts(clientId, portfolioId).pipe(catchError(() => of([])))
        : of<CashAccountOption[]>([])
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly symbolOrderOptions$ = this.stateSubject.pipe(
    map((state) => state.selectedSymbol),
    distinctUntilChanged((a, b) => a?.symbolId === b?.symbolId && a?.market === b?.market),
    switchMap((symbol) =>
      symbol
        ? this.service.getSymbolOrderOptions(symbol).pipe(
            tap((options) => this.patch({ warning: options.warning })),
            catchError(() => of(null))
          )
        : of(null)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly vm$: Observable<OrderEntryViewModel> = this.stateSubject.pipe(
    switchMap((state) =>
      this.clientOptions$.pipe(
        switchMap((clientOptions) =>
          this.portfolioOptions$.pipe(
            switchMap((portfolioOptions) =>
              this.cashAccountOptions$.pipe(
                switchMap((cashAccountOptions) =>
                  this.symbolOptions$.pipe(
                    switchMap((symbolOptions) =>
                      this.lookups$.pipe(
                        switchMap((lookups) =>
                          this.symbolOrderOptions$.pipe(
                            map((symbolOptionsState) => ({
                              clientOptions,
                              portfolioOptions,
                              cashAccountOptions,
                              symbolOptions,
                              lookups,
                              symbolOptionsState,
                              selectedClient: state.selectedClient,
                              selectedSymbol: state.selectedSymbol,
                              calculation: state.calculation,
                              lastResult: state.lastResult,
                              loading: false,
                              warning: state.warning,
                              error: state.error
                            }))
                          )
                        )
                      )
                    )
                  )
                )
              )
            )
          )
        )
      )
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  updateClientQuery(query: string): void {
    this.clientQuerySubject.next(query);
  }

  updateSymbolQuery(query: string): void {
    this.symbolQuerySubject.next(query);
  }

  selectClient(client: ClientOption | null): void {
    this.patch({ selectedClient: client, selectedMarket: null, selectedPortfolioId: null, selectedSymbol: null, lastResult: null, error: undefined });
  }

  selectMarket(market: string): void {
    this.patch({ selectedMarket: market || null, selectedSymbol: null, warning: undefined, lastResult: null, error: undefined });
  }

  selectPortfolio(portfolioId: string): void {
    this.patch({ selectedPortfolioId: portfolioId });
  }

  selectSymbol(symbol: SymbolOption): void {
    const warning = !symbol.tradingEnabled || !symbol.productEnabled
      ? 'Selected market/product is not currently marked as trading-enabled. You may continue after reviewing this warning.'
      : undefined;
    this.patch({ selectedSymbol: symbol, warning, lastResult: null, error: undefined });
  }

  calculateTakeHitOrder(order: OrderEntryForm): Observable<OrderEntryViewModel['calculation']> {
    return this.service
      .calculateOrder(order)
      .pipe(tap((calculation) => this.patch({ calculation, lastResult: null, error: undefined })));
  }

  simulate(order: OrderEntryForm): Observable<OrderActionResult> {
    return this.service
      .simulateOrder(order)
      .pipe(tap((lastResult) => this.patch({ lastResult, error: undefined })));
  }

  place(order: OrderEntryForm, password: string): Observable<OrderActionResult> {
    return this.service
      .placeOrder({ ...order, password })
      .pipe(tap((lastResult) => this.patch({ lastResult, error: undefined })));
  }

  setError(error: string): void {
    this.patch({ error });
  }

  clearResult(): void {
    this.patch({ calculation: null, lastResult: null, error: undefined, warning: undefined });
  }

  private patch(patch: Partial<OrderEntryState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch
    });
  }
}

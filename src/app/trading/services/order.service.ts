import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { OrderTransactionDetails } from '../order-transaction-details/order-transaction-details.models';
import {
  buildSearchParams,
  mapCalculationResponse,
  mapCashAccountOptionsResponse,
  mapClientOptionsResponse,
  mapOrderActionResponse,
  mapOrderDetailsResponse,
  mapOrderLookupsResponse,
  mapOrderSearchResponse,
  mapOrderStatisticsResponse,
  mapPortfolioOptionsResponse,
  mapSymbolOptionsResponse,
  mapSymbolOrderOptionsResponse
} from './order.mapper';
import type {
  CalculateRequest,
  CashAccountOption,
  ClientOption,
  OrderActionRequest,
  OrderActionResult,
  OrderCalculationResult,
  OrderEntryForm,
  OrderLookups,
  OrderModificationRequest,
  OrderMonitoringRow,
  OrderRequest,
  OrderSearchRequest,
  OrderStatisticsRequest,
  OrderStatisticsRow,
  PortfolioOption,
  SymbolOption,
  SymbolOrderOptions
} from './order.models';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/orders`;

  searchClients(query: string): Observable<ClientOption[]> {
    return this.http
      .get<unknown>(`${this.base}/clients`, { params: new HttpParams().set('query', query) })
      .pipe(map(mapClientOptionsResponse));
  }

  searchSymbols(query: string, market?: string): Observable<SymbolOption[]> {
    let params = new HttpParams().set('query', query);
    if (market) {
      params = params.set('market', market);
    }
    return this.http.get<unknown>(`${this.base}/symbols`, { params }).pipe(map(mapSymbolOptionsResponse));
  }

  getOrderLookups(): Observable<OrderLookups> {
    return this.http.get<unknown>(`${this.base}/lookups`).pipe(map(mapOrderLookupsResponse));
  }

  getClientPortfolios(clientId: string): Observable<PortfolioOption[]> {
    return this.http
      .get<unknown>(`${this.base}/clients/${encodeURIComponent(clientId)}/portfolios`)
      .pipe(map(mapPortfolioOptionsResponse));
  }

  getClientCashAccounts(clientId: string, portfolioId: string): Observable<CashAccountOption[]> {
    return this.http
      .get<unknown>(`${this.base}/clients/${encodeURIComponent(clientId)}/portfolios/${encodeURIComponent(portfolioId)}/cash-accounts`)
      .pipe(map(mapCashAccountOptionsResponse));
  }

  getSymbolOrderOptions(symbolId: string, market: string): Observable<SymbolOrderOptions> {
    return this.http
      .get<unknown>(`${this.base}/symbols/${encodeURIComponent(symbolId)}/options`, {
        params: new HttpParams().set('market', market)
      })
      .pipe(map(mapSymbolOrderOptionsResponse));
  }

  simulateOrder(orderRequest: OrderRequest): Observable<OrderActionResult> {
    return this.http.post<unknown>(`${this.base}/simulate`, orderRequest).pipe(map(mapOrderActionResponse));
  }

  placeOrder(orderRequest: OrderRequest): Observable<OrderActionResult> {
    return this.http.post<unknown>(`${this.base}/place`, orderRequest).pipe(map(mapOrderActionResponse));
  }

  calculateTakeHitOrder(calculateRequest: CalculateRequest): Observable<OrderCalculationResult> {
    return this.http.post<unknown>(`${this.base}/calculate-take-hit`, calculateRequest).pipe(map(mapCalculationResponse));
  }

  searchOrders(orderSearchRequest: OrderSearchRequest): Observable<OrderMonitoringRow[]> {
    return this.http
      .get<unknown>(`${this.base}/search`, { params: buildSearchParams(orderSearchRequest) })
      .pipe(map(mapOrderSearchResponse));
  }

  modifyOrder(orderModificationRequest: OrderModificationRequest): Observable<OrderActionResult> {
    return this.http.post<unknown>(`${this.base}/modify`, orderModificationRequest).pipe(map(mapOrderActionResponse));
  }

  cancelOrder(cancelRequest: OrderActionRequest): Observable<OrderActionResult> {
    return this.http.post<unknown>(`${this.base}/cancel`, cancelRequest).pipe(map(mapOrderActionResponse));
  }

  suspendOrder(suspendRequest: OrderActionRequest): Observable<OrderActionResult> {
    return this.http.post<unknown>(`${this.base}/suspend`, suspendRequest).pipe(map(mapOrderActionResponse));
  }

  activateOrder(activateRequest: OrderActionRequest): Observable<OrderActionResult> {
    return this.http.post<unknown>(`${this.base}/activate`, activateRequest).pipe(map(mapOrderActionResponse));
  }

  getOrderTransactionDetails(orderNumber: string): Observable<OrderTransactionDetails> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(orderNumber)}/transaction-details`)
      .pipe(map(mapOrderDetailsResponse));
  }

  getOrderStatistics(orderStatisticsRequest: OrderStatisticsRequest): Observable<OrderStatisticsRow[]> {
    return this.http
      .get<unknown>(`${this.base}/statistics`, { params: buildSearchParams(orderStatisticsRequest) })
      .pipe(map(mapOrderStatisticsResponse));
  }
}

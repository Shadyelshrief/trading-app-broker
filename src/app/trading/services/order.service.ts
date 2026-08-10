import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map, of, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BrokerLookupsService } from '../../shared/lookups/broker-lookups.service';
import { ReferenceDataLookupsService } from '../../shared/lookups/reference-data-lookups.service';
import type { OrderTransactionDetails } from '../order-transaction-details/order-transaction-details.models';
import {
  buildSearchParams,
  mapOrderActionResponse,
  mapOrderDetailsResponse,
  mapMonitoringRowToOrderDetails,
  mapOrderSearchResponse,
  mapOrderStatisticsResponse
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
  MarketSessionOption,
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
  private readonly brokerLookups = inject(BrokerLookupsService);
  private readonly reference = inject(ReferenceDataLookupsService);
  private readonly base = `${environment.apiUrl}/orders`;

  searchClients(query: string): Observable<ClientOption[]> {
    return this.brokerLookups.searchClients(query);
  }

  searchSymbols(query: string, market?: string): Observable<SymbolOption[]> {
    return forkJoin({
      markets: this.reference.getMarkets(),
      products: this.reference.searchAssets(query, market)
    }).pipe(
      map(({ markets, products }) =>
        products
          .map((product) => {
            const marketOption = markets.find((item) => item.code.toUpperCase() === product.marketCode.toUpperCase());
            return {
              productId: product.id,
              marketId: marketOption?.id,
              symbolId: product.symbol,
              symbolName: product.label.replace(`${product.symbol} - `, ''),
              symbolShortName: product.symbol,
              market: product.marketCode,
              currency: '',
              tradingEnabled: true,
              productEnabled: true
            };
          })
      )
    );
  }

  getOrderLookups(): Observable<OrderLookups> {
    return this.reference.getMarkets().pipe(
      map((markets) => ({
        orderSides: [
          { label: 'Buy', value: 'BUY' },
          { label: 'Sell', value: 'SELL' }
        ],
        orderTypes: [
          { label: 'Limit Order', value: 'LIMIT' },
          { label: 'Market Order', value: 'MARKET' }
        ],
        goodTillOptions: [
          { label: 'Day', value: 'DAY' },
          { label: 'GTC', value: 'GTC' },
          { label: 'IOC', value: 'IOC' },
          { label: 'FOK', value: 'FOK' }
        ],
        fillTerms: [],
        markets: markets.map((market) => ({ label: market.label, value: market.value })),
        statuses: ['NEW', 'PENDING', 'PARTIALLY_EXECUTED', 'EXECUTED', 'CANCELLED', 'REJECTED'].map((status) => ({
          label: status,
          value: status
        })),
        statusGroups: []
      }))
    );
  }

  getClientPortfolios(clientId: string): Observable<PortfolioOption[]> {
    return this.brokerLookups.getClientPortfolios(clientId);
  }

  getClientCashAccounts(_clientId: string, portfolioId: string): Observable<CashAccountOption[]> {
    return this.brokerLookups.getPortfolioWallets(portfolioId).pipe(
      map((wallets) =>
        wallets.map((wallet) => ({
          cashAccountId: wallet.walletId,
          cashAccountName: wallet.walletName,
          currency: wallet.currency
        }))
      )
    );
  }

  getSymbolOrderOptions(symbol: SymbolOption): Observable<SymbolOrderOptions> {
    const params = new HttpParams()
      .set('market', symbol.marketId ?? symbol.market)
      .set('product', symbol.productId ?? symbol.symbolId);

    return this.http.get<ApiResponse<MarketSessionDto[]>>(`${this.base}/sessions`, { params }).pipe(
      map((response) => ({
        orderTypes: [
          { label: 'Limit Order', value: 'LIMIT' },
          { label: 'Market Order', value: 'MARKET' }
        ],
        goodTillOptions: [
          { label: 'Day', value: 'DAY' },
          { label: 'GTC', value: 'GTC' },
          { label: 'IOC', value: 'IOC' },
          { label: 'FOK', value: 'FOK' }
        ],
        sessions: (response.body ?? []).map(mapMarketSession).filter((session): session is MarketSessionOption => session !== null),
        fillTerms: []
      }))
    );
  }

  simulateOrder(orderRequest: OrderRequest): Observable<OrderActionResult> {
    return this.calculateOrder(orderRequest).pipe(
      map((calculation) => ({
        success: true,
        message: 'Order calculation completed.',
        orderAmount: calculation.orderAmount,
        orderTradeAmount: calculation.tradeAmount,
        orderFees: calculation.fees
      }))
    );
  }

  placeOrder(orderRequest: OrderRequest): Observable<OrderActionResult> {
    return this.buildOnlineOrder(orderRequest).pipe(
      switchMap((body) =>
        this.http
          .post<unknown>(`${environment.apiUrl}/clients/${encodeURIComponent(orderRequest.clientId)}/orders`, body)
          .pipe(map(mapOrderActionResponse))
      )
    );
  }

  calculateOrder(orderRequest: OrderEntryForm): Observable<OrderCalculationResult> {
    return this.buildOnlineOrder(orderRequest).pipe(
      switchMap((body) =>
        this.http
          .post<unknown>(`${environment.apiUrl}/clients/${encodeURIComponent(orderRequest.clientId)}/orders/calculate`, body)
          .pipe(map((response) => mapBackendCalculation(response, orderRequest)))
      )
    );
  }

  calculateTakeHitOrder(calculateRequest: CalculateRequest): Observable<OrderCalculationResult> {
    return this.calculateOrder(calculateRequest as OrderEntryForm);
  }

  searchOrders(orderSearchRequest: OrderSearchRequest): Observable<OrderMonitoringRow[]> {
    return this.buildOrderSearchParams(orderSearchRequest).pipe(
      switchMap((params) => this.http.get<unknown>(this.base, { params }).pipe(map(mapOrderSearchResponse)))
    );
  }

  modifyOrder(orderModificationRequest: OrderModificationRequest): Observable<OrderActionResult> {
    const orderId = orderModificationRequest.orderNumber;
    return this.http
      .put<unknown>(`${this.base}/${encodeURIComponent(orderId)}`, {
        orderId,
        newQuantity: orderModificationRequest.quantity,
        newPrice: orderModificationRequest.orderPrice ?? null
      })
      .pipe(map(mapOrderActionResponse));
  }

  cancelOrder(cancelRequest: OrderActionRequest): Observable<OrderActionResult> {
    return this.http.delete<unknown>(`${this.base}/${encodeURIComponent(cancelRequest.orderNumber)}`).pipe(map(mapOrderActionResponse));
  }

  suspendOrder(suspendRequest: OrderActionRequest): Observable<OrderActionResult> {
    return of({ success: false, message: 'Suspend order is not supported by the current broker API.' });
  }

  activateOrder(activateRequest: OrderActionRequest): Observable<OrderActionResult> {
    return of({ success: false, message: 'Activate order is not supported by the current broker API.' });
  }

  getOrderTransactionDetails(orderNumber: string): Observable<OrderTransactionDetails> {
    return this.searchOrders({ orderNumber }).pipe(
      map((rows) => {
        const row = rows.find((candidate) => candidate.orderNumber === orderNumber);
        return row ? mapMonitoringRowToOrderDetails(row) : mapOrderDetailsResponse({ orderNumber });
      })
    );
  }

  getOrderStatistics(orderStatisticsRequest: OrderStatisticsRequest): Observable<OrderStatisticsRow[]> {
    return this.searchOrders(orderStatisticsRequest).pipe(map((rows) => [aggregateOrderStatistics(rows)]));
  }

  getBrokerBasket(): Observable<OrderRequest[]> {
    return this.http.get<unknown>(`${this.base}/basket`).pipe(map((response) => mapArrayBody(response) as OrderRequest[]));
  }

  saveToClientBasket(orderRequest: OrderRequest): Observable<OrderActionResult> {
    return this.buildOnlineOrder(orderRequest).pipe(
      switchMap((body) =>
        this.http
          .post<unknown>(`${environment.apiUrl}/clients/${encodeURIComponent(orderRequest.clientId)}/orders/basket`, body)
          .pipe(map(mapOrderActionResponse))
      )
    );
  }

  private buildOrderSearchParams(request: OrderSearchRequest): Observable<HttpParams> {
    return this.resolveMarketId(request.market).pipe(
      map((marketId) => {
        let params = new HttpParams().set('page', '1').set('size', '200');
        if (request.clientId) params = params.set('clientId', request.clientId);
        if (marketId) params = params.set('marketId', marketId);
        if (request.status) params = params.set('status', request.status);
        if (request.type && request.type !== 'BUY' && request.type !== 'SELL') params = params.set('orderType', request.type);
        if (request.orderNumber) params = params.set('q', request.orderNumber);
        return params;
      })
    );
  }

  private buildOnlineOrder(order: OrderEntryForm): Observable<OnlineOrderRequest> {
    return forkJoin({
      marketId: this.resolveMarketId(order.market),
      assetId: this.resolveProductId(order.market, order.symbolId)
    }).pipe(
      map(({ marketId, assetId }) => {
        if (!marketId || !assetId) {
          throw new Error('Unable to resolve market/asset identifiers for order submission.');
        }

        return {
          targetClientId: order.clientId,
          portfolioId: order.portfolioId,
          walletId: order.cashAccountId,
          assetId,
          marketId,
          direction: order.orderSide,
          orderType: order.orderType === 'MARKET' || order.orderType === 'TAKE' || order.orderType === 'HIT' ? 'MARKET' : 'LIMIT',
          timeInForce: mapTimeInForce(order.goodTill),
          quantity: Number(order.quantity ?? 0),
          price: order.orderType === 'LIMIT' ? order.orderPrice ?? null : null
        };
      })
    );
  }

  private resolveMarketId(market?: string): Observable<string | undefined> {
    const value = market?.trim();
    if (!value) {
      return of(undefined);
    }

    return this.reference.getMarkets().pipe(
      map((markets) => markets.find((item) => item.id === value || item.value === value.toLowerCase() || item.code.toUpperCase() === value.toUpperCase())?.id)
    );
  }

  private resolveProductId(market: string, symbolId: string): Observable<string | undefined> {
    return this.reference.searchAssets(symbolId, market).pipe(
      map((products) => products.find((product) => product.symbol.toUpperCase() === symbolId.toUpperCase())?.id)
    );
  }
}

interface OnlineOrderRequest {
  targetClientId: string;
  portfolioId: string;
  walletId: string;
  assetId: string;
  marketId: string;
  direction: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  timeInForce: 'DAY' | 'GTC' | 'IOC' | 'FOK';
  quantity: number;
  price: number | null;
}

interface ApiResponse<T> {
  body?: T;
}

interface MarketSessionDto {
  id?: string;
  name?: string;
  sessionStart?: string;
  sessionEnd?: string;
  isPrimarySession?: boolean;
  isDefault?: boolean;
}

function mapMarketSession(session: MarketSessionDto): MarketSessionOption | null {
  const value = session.id?.trim();
  const name = session.name?.trim();

  if (!value || !name) {
    return null;
  }

  const hours = session.sessionStart && session.sessionEnd
    ? ` (${session.sessionStart} - ${session.sessionEnd})`
    : '';

  return {
    value,
    label: `${name}${hours}`,
    isDefault: Boolean(session.isDefault || session.isPrimarySession)
  };
}

function mapTimeInForce(value: OrderEntryForm['goodTill']): OnlineOrderRequest['timeInForce'] {
  if (value === 'GTC' || value === 'FOK') {
    return value;
  }
  if (value === 'FAK') {
    return 'IOC';
  }
  return 'DAY';
}

function mapBackendCalculation(response: unknown, order: OrderEntryForm): OrderCalculationResult {
  const record = toRecord(response);
  const body = toRecord(record?.['body']) ?? {};
  const tradeAmount = toNumber(body['tradeValue']) ?? (order.quantity ?? 0) * (order.orderPrice ?? 0);
  const fees = (toNumber(body['estimatedCommission']) ?? 0) + (toNumber(body['estimatedVat']) ?? 0);
  return {
    quantity: order.quantity ?? 0,
    orderPrice: order.orderPrice ?? 0,
    tradeAmount,
    fees,
    orderAmount: toNumber(body['totalRequiredOrReceived']) ?? tradeAmount + fees
  };
}

function aggregateOrderStatistics(rows: readonly OrderMonitoringRow[]): OrderStatisticsRow {
  return rows.reduce<OrderStatisticsRow>(
    (total, row) => {
      const value = (typeof row.price === 'number' ? row.price : 0) * row.quantity;
      if (row.orderSide === 'SELL') {
        total.totalSellQuantityActive += row.quantity;
        total.totalSellQuantityExecuted += row.executedQuantity;
        total.totalSellValueActive += value;
        total.totalSellValueExecuted += (typeof row.price === 'number' ? row.price : 0) * row.executedQuantity;
      } else {
        total.totalBuyQuantityActive += row.quantity;
        total.totalBuyQuantityExecuted += row.executedQuantity;
        total.totalBuyValueActive += value;
        total.totalBuyValueExecuted += (typeof row.price === 'number' ? row.price : 0) * row.executedQuantity;
      }
      total.orderCount += 1;
      total.netPositionActive = total.totalBuyValueActive - total.totalSellValueActive;
      total.netPositionExecuted = total.totalBuyValueExecuted - total.totalSellValueExecuted;
      total.currency ||= row.currency;
      return total;
    },
    {
      orderCount: 0,
      totalSellValueActive: 0,
      totalSellValueExecuted: 0,
      totalSellQuantityActive: 0,
      totalSellQuantityExecuted: 0,
      totalBuyValueActive: 0,
      totalBuyValueExecuted: 0,
      totalBuyQuantityActive: 0,
      totalBuyQuantityExecuted: 0,
      totalCommission: 0,
      currency: '',
      netPositionActive: 0,
      netPositionExecuted: 0
    }
  );
}

function mapArrayBody(response: unknown): unknown[] {
  const record = toRecord(response);
  return Array.isArray(record?.['body']) ? record['body'] as unknown[] : [];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

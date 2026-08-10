import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { OrderService } from '../services/order.service';
import { mapMonitoringRowToOrderDetails } from '../services/order.mapper';
import { OrderMonitoringRow } from '../services/order.models';
import { createOrderTransactionHistoryColumns } from './order-transaction-details.columns';
import { mapExecutionRowToOrderTransactionDetails } from './order-transaction-details.mapper';
import { OrderTransactionDetails, OrderTransactionDetailsSourceRow } from './order-transaction-details.models';

@Injectable()
export class OrderTransactionDetailsFacade {
  constructor(private readonly orderService: OrderService) {}

  readonly historyColumns = createOrderTransactionHistoryColumns();
  readonly gridSettings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 12,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'order-transaction-details'
  };

  buildDetails(row: OrderTransactionDetailsSourceRow): OrderTransactionDetails {
    return isMonitoringRow(row)
      ? mapMonitoringRowToOrderDetails(row)
      : mapExecutionRowToOrderTransactionDetails(row);
  }

  loadDetails(orderNumber: string, fallbackRow?: OrderTransactionDetailsSourceRow): Observable<OrderTransactionDetails> {
    const fallback = fallbackRow ? this.buildDetails(fallbackRow) : emptyDetails(orderNumber);

    return this.orderService.getOrderTransactionDetails(orderNumber).pipe(
      map((details) => mergeDetails(details, fallback)),
      catchError(() => of(fallback))
    );
  }
}

function isMonitoringRow(row: OrderTransactionDetailsSourceRow): row is OrderMonitoringRow {
  return 'executedQuantity' in row && 'status' in row;
}

function mergeDetails(primary: OrderTransactionDetails, fallback: OrderTransactionDetails): OrderTransactionDetails {
  const hasPrimaryData =
    primary.status !== '--' ||
    Boolean(primary.order.portfolio || primary.order.company || primary.order.orderType) ||
    primary.orderInfo.orderQuantity > 0 ||
    primary.transactions.length > 0;

  if (!hasPrimaryData) {
    return fallback;
  }

  return {
    ...fallback,
    ...primary,
    order: { ...fallback.order, ...primary.order },
    orderInfo: { ...fallback.orderInfo, ...primary.orderInfo },
    executionInfo: { ...fallback.executionInfo, ...primary.executionInfo },
    transactions: primary.transactions.length > 0 ? primary.transactions : fallback.transactions
  };
}

function emptyDetails(orderNumber: string): OrderTransactionDetails {
  return {
    orderNumber,
    status: '--',
    order: {
      portfolio: '',
      orderType: '',
      company: '',
      fillTerm: '',
      orderDate: '',
      session: '',
      minimumQuantity: 0,
      period: '',
      disclosedVolume: 0,
      expiryDate: '',
      sameDay: false,
      cashAccount: ''
    },
    orderInfo: {
      orderQuantity: 0,
      price: '--',
      currency: '',
      tradeAmount: 0,
      feesAmount: 0,
      totalOrderAmount: 0
    },
    executionInfo: {
      remainingQuantity: 0,
      executedQuantity: 0,
      executedAmount: 0
    },
    transactions: []
  };
}

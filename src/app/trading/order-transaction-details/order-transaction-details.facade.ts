import { Injectable } from '@angular/core';
import { Observable, catchError, of } from 'rxjs';

import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { ExecutionTickerRow } from '../execution-ticker/execution-ticker.models';
import { OrderService } from '../services/order.service';
import { createOrderTransactionHistoryColumns } from './order-transaction-details.columns';
import { mapExecutionRowToOrderTransactionDetails } from './order-transaction-details.mapper';
import { OrderTransactionDetails } from './order-transaction-details.models';

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

  buildDetails(row: ExecutionTickerRow): OrderTransactionDetails {
    return mapExecutionRowToOrderTransactionDetails(row);
  }

  loadDetails(orderNumber: string, fallbackRow?: ExecutionTickerRow): Observable<OrderTransactionDetails> {
    return this.orderService.getOrderTransactionDetails(orderNumber).pipe(
      catchError(() => (fallbackRow ? of(this.buildDetails(fallbackRow)) : of(emptyDetails(orderNumber))))
    );
  }
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
      custodian: '',
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

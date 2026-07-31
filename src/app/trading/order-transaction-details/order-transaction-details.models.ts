import { ExecutionTickerRow } from '../execution-ticker/execution-ticker.models';

export interface OrderTransactionDetailsDialogData {
  row?: ExecutionTickerRow;
  orderNumber?: string;
}

export interface OrderTransactionDetails {
  orderNumber: string;
  status: string;
  order: {
    portfolio: string;
    orderType: string;
    company: string;
    fillTerm: string;
    orderDate: string;
    session: string;
    minimumQuantity: number;
    period: string;
    disclosedVolume: number;
    expiryDate: string;
    sameDay: boolean;
    cashAccount: string;
  };
  orderInfo: {
    orderQuantity: number;
    price: number | string;
    currency: string;
    tradeAmount: number;
    feesAmount: number;
    totalOrderAmount: number;
  };
  executionInfo: {
    remainingQuantity: number;
    executedQuantity: number;
    executedAmount: number;
    orderRejectionReason?: string;
  };
  transactions: OrderTransactionHistoryRow[];
}

export interface OrderTransactionHistoryRow {
  serialNo: number;
  transactionTime: string;
  type: string;
  expiryDate: string;
  quantity: number;
  price: number | string;
  fees: number;
  tradingAmount: number;
  orderAmount: number;
  averagePrice: number | string;
  status: string;
  delivered: number | string;
  session: string;
}

import { ExecutionTickerRow } from '../execution-ticker/execution-ticker.models';
import { OrderTransactionDetails, OrderTransactionHistoryRow } from './order-transaction-details.models';

type UnknownRecord = Record<string, unknown>;

export function mapExecutionRowToOrderTransactionDetails(row: ExecutionTickerRow): OrderTransactionDetails {
  const raw = toRecord(row.raw) ?? {};
  const price = toNumber(raw['price'] ?? raw['orderPrice'] ?? raw['order_price']) ?? row.price;
  const quantity = toNumber(raw['orderQuantity'] ?? raw['order_quantity'] ?? raw['quantity']) ?? row.quantity;
  const tradeAmount = numericPrice(price) * quantity;
  const feesAmount = toNumber(raw['feesAmount'] ?? raw['fees'] ?? raw['fees_amount']) ?? 0;

  return {
    orderNumber: row.orderNumber,
    status: toString(raw['status'] ?? raw['orderStatus'] ?? raw['order_status']) ?? row.transactionType,
    order: {
      portfolio: toString(raw['portfolioName'] ?? raw['portfolio_name'] ?? raw['portfolio']) ?? row.portfolioNumber,
      orderType: toString(raw['orderType'] ?? raw['order_type']) ?? row.orderSide,
      company: toString(raw['company'] ?? raw['companyName'] ?? raw['symbolName']) ?? row.symbolName,
      fillTerm: toString(raw['fillTerm'] ?? raw['fill_term']) ?? '',
      orderDate: toDateTimeLabel(raw['orderDate'] ?? raw['order_date'] ?? row.receivedAt),
      session: toString(raw['sessionName'] ?? raw['session'] ?? raw['marketSession'] ?? raw['sessionId']) ?? '',
      minimumQuantity: toNumber(raw['minimumQuantity'] ?? raw['minimum_quantity']) ?? 0,
      period: toString(raw['period']) ?? '',
      disclosedVolume: toNumber(raw['disclosedVolume'] ?? raw['disclosed_volume']) ?? 0,
      expiryDate: toDateTimeLabel(raw['expiryDate'] ?? raw['expiry_date']),
      sameDay: Boolean(raw['sameDay'] ?? raw['same_day']),
      cashAccount: toString(raw['cashAccount'] ?? raw['cash_account']) ?? ''
    },
    orderInfo: {
      orderQuantity: quantity,
      price,
      currency: row.currency,
      tradeAmount,
      feesAmount,
      totalOrderAmount: toNumber(raw['totalOrderAmount'] ?? raw['total_order_amount']) ?? tradeAmount + feesAmount
    },
    executionInfo: {
      remainingQuantity: row.remainingQuantity,
      executedQuantity: toNumber(raw['executedQuantity'] ?? raw['executed_quantity']) ?? Math.max(0, quantity - row.remainingQuantity),
      executedAmount: toNumber(raw['executedAmount'] ?? raw['executed_amount']) ?? numericPrice(row.price) * row.quantity,
      orderRejectionReason: toString(raw['orderRejectionReason'] ?? raw['rejectionReason'] ?? raw['reject_reason'])
    },
    transactions: mapTransactionHistory(raw, row)
  };
}

function mapTransactionHistory(raw: UnknownRecord, row: ExecutionTickerRow): OrderTransactionHistoryRow[] {
  const history = raw['transactions'] ?? raw['transactionHistory'] ?? raw['history'];

  if (Array.isArray(history)) {
    return history
      .map((entry, index) => mapHistoryRecord(entry, index + 1, row))
      .filter((entry): entry is OrderTransactionHistoryRow => entry !== null);
  }

  return [
    {
      serialNo: 1,
      transactionTime: toTimeLabel(row.receivedAt),
      type: row.transactionType,
      expiryDate: '',
      quantity: row.quantity,
      price: row.price,
      fees: 0,
      tradingAmount: numericPrice(row.price) * row.quantity,
      orderAmount: numericPrice(row.price) * row.quantity,
      averagePrice: row.price,
      status: row.transactionType,
      delivered: '',
      session: ''
    }
  ];
}

function mapHistoryRecord(value: unknown, serialNo: number, row: ExecutionTickerRow): OrderTransactionHistoryRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  return {
    serialNo: toNumber(record['serialNo'] ?? record['serial_no']) ?? serialNo,
    transactionTime: toDateTimeLabel(record['transactionTime'] ?? record['transaction_time'] ?? record['time']),
    type: toString(record['type']) ?? row.transactionType,
    expiryDate: toDateTimeLabel(record['expiryDate'] ?? record['expiry_date']),
    quantity: toNumber(record['quantity'] ?? record['qty']) ?? 0,
    price: toNumber(record['price']) ?? toString(record['price']) ?? '--',
    fees: toNumber(record['fees']) ?? 0,
    tradingAmount: toNumber(record['tradingAmount'] ?? record['trading_amount']) ?? 0,
    orderAmount: toNumber(record['orderAmount'] ?? record['order_amount']) ?? 0,
    averagePrice: toNumber(record['averagePrice'] ?? record['average_price']) ?? toString(record['averagePrice']) ?? '--',
    status: toString(record['status']) ?? '',
    delivered: toNumber(record['delivered']) ?? toString(record['delivered']) ?? '',
    session: toString(record['sessionName'] ?? record['session'] ?? record['marketSession'] ?? record['sessionId']) ?? ''
  };
}

function toRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function toString(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value}`;
  }

  return undefined;
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

function numericPrice(value: number | string): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0;
}

function toDateTimeLabel(value: unknown): string {
  const timestamp = toNumber(value) ?? (typeof value === 'string' ? Date.parse(value) : NaN);

  if (!Number.isFinite(timestamp)) {
    return typeof value === 'string' ? value : '';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'short',
    timeStyle: 'medium'
  }).format(timestamp);
}

function toTimeLabel(timestamp: number): string {
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(timestamp);
}

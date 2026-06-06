import { HttpParams } from '@angular/common/http';

import type {
  CashAccountOption,
  ClientOption,
  LookupOption,
  OrderActionResult,
  OrderCalculationResult,
  OrderLookups,
  OrderMonitoringRow,
  OrderSearchRequest,
  OrderStatisticsRequest,
  OrderStatisticsRow,
  PortfolioOption,
  SymbolOption,
  SymbolOrderOptions
} from './order.models';
import type { OrderTransactionDetails, OrderTransactionHistoryRow } from '../order-transaction-details/order-transaction-details.models';

export function mapClientOptionsResponse(response: unknown): ClientOption[] {
  return mapArray(response).map(mapClientOption).filter((item): item is ClientOption => item !== null);
}

export function mapPortfolioOptionsResponse(response: unknown): PortfolioOption[] {
  return mapArray(response).map(mapPortfolioOption).filter((item): item is PortfolioOption => item !== null);
}

export function mapCashAccountOptionsResponse(response: unknown): CashAccountOption[] {
  return mapArray(response).map(mapCashAccountOption).filter((item): item is CashAccountOption => item !== null);
}

export function mapSymbolOptionsResponse(response: unknown): SymbolOption[] {
  return mapArray(response).map(mapSymbolOption).filter((item): item is SymbolOption => item !== null);
}

export function mapOrderLookupsResponse(response: unknown): OrderLookups {
  const record = toRecord(response) ?? {};

  return {
    orderSides: mapLookupArray(record['orderSides'] ?? ['Buy', 'Sell']),
    orderTypes: mapLookupArray(record['orderTypes'] ?? ['Limit Order', 'Market Order', 'Take Order', 'Hit Order']),
    goodTillOptions: mapLookupArray(record['goodTillOptions'] ?? record['goodTill'] ?? ['Day', 'GTW', 'GTM', 'GTD', 'FOK', 'GTC', 'FAK', 'At Opening', 'GTT']),
    fillTerms: mapLookupArray(record['fillTerms'] ?? ['Market Default', 'AON', 'MF', 'MB']),
    custodians: mapLookupArray(record['custodians'] ?? []),
    markets: mapLookupArray(record['markets'] ?? ['All Markets', 'ADX', 'DFM', 'Saudi Arabian Stock Market']),
    statuses: mapLookupArray(record['statuses'] ?? []),
    statusGroups: mapLookupArray(record['statusGroups'] ?? ['Outstanding', 'Market Outstanding', 'Cancelled', 'Partially Executed', 'Fully Executed', 'Rejected']),
    maxExpiryDate: toString(record['maxExpiryDate'] ?? record['max_expiry_date'])
  };
}

export function mapSymbolOrderOptionsResponse(response: unknown): SymbolOrderOptions {
  const record = toRecord(response) ?? {};

  return {
    orderTypes: mapLookupArray(record['orderTypes'] ?? ['Limit Order', 'Market Order', 'Take Order', 'Hit Order']),
    goodTillOptions: mapLookupArray(record['goodTillOptions'] ?? record['goodTill'] ?? ['Day', 'GTW', 'GTM', 'GTD', 'FOK', 'GTC', 'FAK', 'At Opening', 'GTT']),
    custodians: mapLookupArray(record['custodians'] ?? []),
    fillTerms: mapLookupArray(record['fillTerms'] ?? ['Market Default', 'AON', 'MF', 'MB']),
    maxExpiryDate: toString(record['maxExpiryDate'] ?? record['max_expiry_date']),
    warning: toString(record['warning'] ?? record['marketWarning'] ?? record['productWarning'])
  };
}

export function mapCalculationResponse(response: unknown): OrderCalculationResult {
  const record = toRecord(response) ?? {};

  return {
    quantity: toNumber(record['quantity']) ?? 0,
    orderPrice: toNumber(record['orderPrice'] ?? record['price']) ?? 0,
    tradeAmount: toNumber(record['tradeAmount'] ?? record['trade_amount']) ?? 0,
    fees: toNumber(record['fees'] ?? record['orderFees']) ?? 0,
    orderAmount: toNumber(record['orderAmount'] ?? record['totalOrderAmount']) ?? 0
  };
}

export function mapOrderActionResponse(response: unknown): OrderActionResult {
  const record = toRecord(response) ?? {};
  const success = Boolean(record['success'] ?? record['isSuccess'] ?? record['succeeded'] ?? true);

  return {
    success,
    message: toString(record['message'] ?? record['statusMessage']) ?? (success ? 'Order request completed.' : 'Order request failed.'),
    orderNumber: toString(record['orderNumber'] ?? record['order_no'] ?? record['id']),
    orderAmount: toNumber(record['orderAmount'] ?? record['totalOrderAmount']),
    orderTradeAmount: toNumber(record['orderTradeAmount'] ?? record['tradeAmount']),
    orderFees: toNumber(record['orderFees'] ?? record['fees'])
  };
}

export function mapOrderSearchResponse(response: unknown): OrderMonitoringRow[] {
  return mapArray(response).map(mapOrderMonitoringRow).filter((row): row is OrderMonitoringRow => row !== null);
}

export function mapOrderStatisticsResponse(response: unknown): OrderStatisticsRow[] {
  return mapArray(response).map(mapOrderStatisticsRow).filter((row): row is OrderStatisticsRow => row !== null);
}

export function mapOrderDetailsResponse(response: unknown): OrderTransactionDetails {
  const record = toRecord(response) ?? {};

  return {
    orderNumber: toString(record['orderNumber'] ?? record['order_number']) ?? '--',
    status: toString(record['status']) ?? '--',
    order: {
      portfolio: toString(record['portfolio']) ?? '',
      orderType: toString(record['orderType'] ?? record['order_type']) ?? '',
      company: toString(record['company'] ?? record['symbolName']) ?? '',
      fillTerm: toString(record['fillTerm'] ?? record['fill_term']) ?? '',
      orderDate: toString(record['orderDate'] ?? record['order_date']) ?? '',
      custodian: toString(record['custodian']) ?? '',
      minimumQuantity: toNumber(record['minimumQuantity'] ?? record['minimum_quantity']) ?? 0,
      period: toString(record['period'] ?? record['goodTill']) ?? '',
      disclosedVolume: toNumber(record['disclosedVolume'] ?? record['disclosed_volume']) ?? 0,
      expiryDate: toString(record['expiryDate'] ?? record['expiry_date']) ?? '',
      sameDay: Boolean(record['sameDay'] ?? record['same_day']),
      cashAccount: toString(record['cashAccount'] ?? record['cash_account']) ?? ''
    },
    orderInfo: {
      orderQuantity: toNumber(record['orderQuantity'] ?? record['quantity']) ?? 0,
      price: toNumber(record['price']) ?? toString(record['price']) ?? '--',
      currency: toString(record['currency']) ?? '',
      tradeAmount: toNumber(record['tradeAmount'] ?? record['trade_amount']) ?? 0,
      feesAmount: toNumber(record['feesAmount'] ?? record['fees_amount'] ?? record['fees']) ?? 0,
      totalOrderAmount: toNumber(record['totalOrderAmount'] ?? record['orderAmount']) ?? 0
    },
    executionInfo: {
      remainingQuantity: toNumber(record['remainingQuantity'] ?? record['remaining_quantity']) ?? 0,
      executedQuantity: toNumber(record['executedQuantity'] ?? record['executed_quantity']) ?? 0,
      executedAmount: toNumber(record['executedAmount'] ?? record['executed_amount']) ?? 0,
      orderRejectionReason: toString(record['orderRejectionReason'] ?? record['rejectionReason'])
    },
    transactions: mapArray(record['transactions'] ?? record['transactionHistory'] ?? record['history']).map(mapHistoryRow)
  };
}

export function buildSearchParams(request: OrderSearchRequest | OrderStatisticsRequest): HttpParams {
  let params = new HttpParams();

  for (const [key, value] of Object.entries(request)) {
    if (value !== undefined && value !== null && `${value}`.trim()) {
      params = params.set(key, `${value}`);
    }
  }

  return params;
}

export function applyOrderEventToRows(rows: readonly OrderMonitoringRow[], event: unknown): OrderMonitoringRow[] {
  const row = mapOrderMonitoringRow(event);

  if (!row) {
    return [...rows];
  }

  const existingIndex = rows.findIndex((item) => item.orderNumber === row.orderNumber);

  if (existingIndex === -1) {
    return [row, ...rows];
  }

  return rows.map((item, index) => (index === existingIndex ? { ...item, ...row, raw: row.raw ?? item.raw } : item));
}

function mapClientOption(value: unknown): ClientOption | null {
  const record = toRecord(value);
  const clientId = toString(record?.['clientId'] ?? record?.['id']);
  return clientId ? { clientId, clientName: toString(record?.['clientName'] ?? record?.['name']) ?? clientId } : null;
}

function mapPortfolioOption(value: unknown): PortfolioOption | null {
  const record = toRecord(value);
  const portfolioId = toString(record?.['portfolioId'] ?? record?.['id']);
  return portfolioId
    ? {
        portfolioId,
        portfolioName: toString(record?.['portfolioName'] ?? record?.['name']) ?? portfolioId,
        currency: toString(record?.['currency']) ?? ''
      }
    : null;
}

function mapCashAccountOption(value: unknown): CashAccountOption | null {
  const record = toRecord(value);
  const cashAccountId = toString(record?.['cashAccountId'] ?? record?.['cashAccount'] ?? record?.['id']);
  return cashAccountId
    ? {
        cashAccountId,
        cashAccountName: toString(record?.['cashAccountName'] ?? record?.['name']) ?? cashAccountId,
        currency: toString(record?.['currency']) ?? ''
      }
    : null;
}

function mapSymbolOption(value: unknown): SymbolOption | null {
  const record = toRecord(value);
  const symbolId = toString(record?.['symbolId'] ?? record?.['symbol'] ?? record?.['id']);
  return symbolId
    ? {
        symbolId,
        symbolName: toString(record?.['symbolName'] ?? record?.['name']) ?? symbolId,
        symbolShortName: toString(record?.['symbolShortName'] ?? record?.['shortName']) ?? symbolId,
        market: toString(record?.['market'] ?? record?.['exchange']) ?? '',
        currency: toString(record?.['currency']) ?? '',
        tradingEnabled: record?.['tradingEnabled'] !== false,
        productEnabled: record?.['productEnabled'] !== false,
        natPrice: toNumber(record?.['natPrice'] ?? record?.['nat']),
        midPrice: toNumber(record?.['midPrice'] ?? record?.['mid'])
      }
    : null;
}

function mapOrderMonitoringRow(value: unknown): OrderMonitoringRow | null {
  const record = toRecord(value);
  const orderNumber = toString(record?.['orderNumber'] ?? record?.['order_number'] ?? record?.['id']);

  if (!record || !orderNumber) {
    return null;
  }

  return {
    orderNumber,
    clientId: toString(record['clientId'] ?? record['client_id']) ?? '',
    clientName: toString(record['clientName'] ?? record['client_name']) ?? '',
    portfolio: toString(record['portfolio'] ?? record['portfolioName'] ?? record['portfolioId']) ?? '',
    portfolioId: toString(record['portfolioId'] ?? record['portfolio_id']),
    status: toString(record['status'] ?? record['orderStatus']) ?? '',
    orderType: toString(record['orderType'] ?? record['order_type'] ?? record['type']) ?? '',
    orderSide: mapSide(record['orderSide'] ?? record['side']),
    symbolId: toString(record['symbolId'] ?? record['symbol']) ?? '',
    symbolShortName: toString(record['symbolShortName'] ?? record['shortName']) ?? '',
    symbolName: toString(record['symbolName'] ?? record['name']) ?? '',
    market: toString(record['market'] ?? record['exchange']),
    price: toNumber(record['price'] ?? record['orderPrice']) ?? toString(record['price'] ?? record['orderPrice']) ?? '--',
    currency: toString(record['currency']) ?? '',
    quantity: toNumber(record['quantity'] ?? record['orderQuantity']) ?? 0,
    executedQuantity: toNumber(record['executedQuantity'] ?? record['executed_quantity']) ?? 0,
    remainingQuantity: toNumber(record['remainingQuantity'] ?? record['remaining_quantity']) ?? 0,
    expiryDate: toString(record['expiryDate'] ?? record['expiry_date']) ?? '',
    removedFromSystem: Boolean(record['removedFromSystem'] ?? record['removed_from_system']),
    updatedAt: resolveTimestamp(record['updatedAt'] ?? record['updated_at'] ?? record['timestamp']),
    raw: value
  };
}

function mapOrderStatisticsRow(value: unknown): OrderStatisticsRow | null {
  const record = toRecord(value);
  return record
    ? {
        orderCount: toNumber(record['orderCount'] ?? record['order_count']) ?? 0,
        totalSellValueActive: toNumber(record['totalSellValueActive'] ?? record['total_sell_value_active']) ?? 0,
        totalSellValueExecuted: toNumber(record['totalSellValueExecuted'] ?? record['total_sell_value_executed']) ?? 0,
        totalSellQuantityActive: toNumber(record['totalSellQuantityActive'] ?? record['total_sell_quantity_active']) ?? 0,
        totalSellQuantityExecuted: toNumber(record['totalSellQuantityExecuted'] ?? record['total_sell_quantity_executed']) ?? 0,
        totalBuyValueActive: toNumber(record['totalBuyValueActive'] ?? record['total_buy_value_active']) ?? 0,
        totalBuyValueExecuted: toNumber(record['totalBuyValueExecuted'] ?? record['total_buy_value_executed']) ?? 0,
        totalBuyQuantityActive: toNumber(record['totalBuyQuantityActive'] ?? record['total_buy_quantity_active']) ?? 0,
        totalBuyQuantityExecuted: toNumber(record['totalBuyQuantityExecuted'] ?? record['total_buy_quantity_executed']) ?? 0,
        totalCommission: toNumber(record['totalCommission'] ?? record['total_commission']) ?? 0,
        currency: toString(record['currency']) ?? '',
        netPositionActive: toNumber(record['netPositionActive'] ?? record['net_position_active']) ?? 0,
        netPositionExecuted: toNumber(record['netPositionExecuted'] ?? record['net_position_executed']) ?? 0
      }
    : null;
}

function mapHistoryRow(value: unknown, index: number): OrderTransactionHistoryRow {
  const record = toRecord(value) ?? {};
  return {
    serialNo: toNumber(record['serialNo'] ?? record['serial_no']) ?? index + 1,
    transactionTime: toString(record['transactionTime'] ?? record['transaction_time']) ?? '',
    type: toString(record['type']) ?? '',
    expiryDate: toString(record['expiryDate'] ?? record['expiry_date']) ?? '',
    quantity: toNumber(record['quantity']) ?? 0,
    price: toNumber(record['price']) ?? toString(record['price']) ?? '--',
    fees: toNumber(record['fees']) ?? 0,
    tradingAmount: toNumber(record['tradingAmount'] ?? record['trading_amount']) ?? 0,
    orderAmount: toNumber(record['orderAmount'] ?? record['order_amount']) ?? 0,
    averagePrice: toNumber(record['averagePrice'] ?? record['average_price']) ?? toString(record['averagePrice']) ?? '--',
    status: toString(record['status']) ?? '',
    delivered: toNumber(record['delivered']) ?? toString(record['delivered']) ?? '',
    custodian: toString(record['custodian']) ?? ''
  };
}

function mapLookupArray(value: unknown): LookupOption[] {
  return mapArray(value).map((item) => {
    const record = toRecord(item);
    const label = toString(record?.['label'] ?? record?.['name'] ?? item) ?? '';
    const value = toString(record?.['value'] ?? record?.['id'] ?? normalizeLookupValue(label)) ?? '';
    return { label, value };
  });
}

function normalizeLookupValue(label: string): string {
  return label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function mapSide(value: unknown): 'BUY' | 'SELL' | undefined {
  const normalized = toString(value)?.toUpperCase();
  return normalized === 'BUY' || normalized === 'SELL' ? normalized : undefined;
}

function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }
  const record = toRecord(response);
  if (!record) {
    return [];
  }
  for (const key of ['items', 'data', 'rows', 'results', 'orders', 'statistics', 'history']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }
  return [];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function toString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.trim()
    : typeof value === 'number' && Number.isFinite(value)
      ? `${value}`
      : undefined;
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

function resolveTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : Date.now();
  }
  return Date.now();
}

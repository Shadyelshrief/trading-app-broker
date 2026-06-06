import { WebSocketState } from '../../core/market-data';
import { ExecutionConnectionState, ExecutionOrderSide, ExecutionTickerRow } from './execution-ticker.models';

type UnknownRecord = Record<string, unknown>;

export function mapExecutionPayloadToRows(payload: unknown, topic: string): ExecutionTickerRow[] {
  return unwrapExecutionPayload(payload)
    .map((entry, index) => mapExecutionRecordToRow(entry, topic, index))
    .filter((row): row is ExecutionTickerRow => row !== null);
}

export function mapExecutionConnectionState(state: WebSocketState | null): ExecutionConnectionState {
  if (!state) {
    return 'DISCONNECTED';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'CONNECTED';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'CONNECTING';
  }

  if (state.status === 'reconnecting') {
    return 'RECONNECTING';
  }

  return 'DISCONNECTED';
}

export function mapExecutionConnectionLabel(state: ExecutionConnectionState): string {
  switch (state) {
    case 'CONNECTED':
      return 'Private feed live';
    case 'CONNECTING':
      return 'Connecting...';
    case 'RECONNECTING':
      return 'Reconnecting...';
    default:
      return 'Disconnected';
  }
}

function mapExecutionRecordToRow(value: unknown, topic: string, index: number): ExecutionTickerRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const receivedAt = resolveTimestamp(
    record['receivedAt'] ??
      record['timestamp'] ??
      record['transactionTime'] ??
      record['transaction_time'] ??
      record['executionTime'] ??
      record['execution_time']
  ) ?? Date.now();
  const orderNumber = toString(
    record['orderNumber'] ??
      record['order_number'] ??
      record['orderId'] ??
      record['order_id'] ??
      record['id']
  );
  const symbolId = toString(record['symbolId'] ?? record['symbol_id'] ?? record['symbol'] ?? record['ticker'])?.toUpperCase();

  if (!orderNumber || !symbolId) {
    return null;
  }

  const price = toNumber(record['price'] ?? record['tradePrice'] ?? record['trade_price'] ?? record['executionPrice']);
  const quantity = toNumber(record['quantity'] ?? record['executedQuantity'] ?? record['executed_quantity'] ?? record['qty']) ?? 0;
  const remainingQuantity =
    toNumber(record['remainingQuantity'] ?? record['remaining_quantity'] ?? record['leavesQty'] ?? record['leaves_qty']) ?? 0;
  const side = resolveOrderSide(record['orderSide'] ?? record['side'] ?? record['buySell'] ?? record['buy_sell']);
  const clientId = toString(record['clientId'] ?? record['client_id']) ?? parseClientIdFromTopic(topic) ?? '';

  return {
    id: buildExecutionId(orderNumber, symbolId, record, index, receivedAt),
    marketName: toString(record['marketName'] ?? record['market_name']) ?? marketNameFromShortName(record['market'] ?? record['exchange']),
    orderNumber,
    symbolId,
    symbolName: toString(record['symbolName'] ?? record['symbol_name'] ?? record['company'] ?? record['companyName']) ?? symbolId,
    currency: toString(record['currency'] ?? record['ccy']) ?? '',
    portfolioNumber: toString(record['portfolioNumber'] ?? record['portfolio_number'] ?? record['portfolio']) ?? '',
    clientId,
    clientName: toString(record['clientName'] ?? record['client_name']) ?? clientId,
    orderSide: side,
    transactionType:
      toString(record['transactionType'] ?? record['transaction_type'] ?? record['type'] ?? record['executionType']) ??
      'Execution',
    price: price ?? toString(record['price']) ?? '--',
    quantity,
    remainingQuantity,
    receivedAt,
    raw: value
  };
}

function buildExecutionId(
  orderNumber: string,
  symbolId: string,
  record: UnknownRecord,
  index: number,
  receivedAt: number
): string {
  return [
    toString(record['transactionId'] ?? record['transaction_id'] ?? record['executionId'] ?? record['execId']),
    orderNumber,
    symbolId,
    toString(record['sequence']),
    receivedAt,
    index
  ]
    .filter((part) => part !== undefined && part !== '')
    .join(':');
}

function unwrapExecutionPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const record = toRecord(payload);

  if (!record) {
    return [];
  }

  for (const key of ['executions', 'orders', 'transactions', 'items', 'rows', 'data']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [record];
}

function parseClientIdFromTopic(topic: string): string | undefined {
  const segments = topic.toLowerCase().split(':');
  const clientIndex = segments.indexOf('client');
  return clientIndex >= 0 ? segments[clientIndex + 1]?.toUpperCase() : undefined;
}

function resolveOrderSide(value: unknown): ExecutionOrderSide {
  const normalized = toString(value)?.trim().toUpperCase();

  if (normalized === 'SELL' || normalized === 'S' || normalized === '2') {
    return 'SELL';
  }

  return 'BUY';
}

function marketNameFromShortName(value: unknown): string {
  const normalized = toString(value)?.toUpperCase();

  switch (normalized) {
    case 'ADX':
      return 'AbuDhabi Stock Market';
    case 'DFM':
      return 'Dubai Stock Market';
    case 'TADAWUL':
    case 'SAUDI':
    case 'TASI':
      return 'Saudi Arabian Stock Market';
    default:
      return normalized ? `${normalized} Market` : '';
  }
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

function resolveTimestamp(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const numeric = Number(value);

    if (Number.isFinite(numeric)) {
      return numeric;
    }

    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
}

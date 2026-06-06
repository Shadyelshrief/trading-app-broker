import { HttpParams } from '@angular/common/http';

import { buildTickTopic } from '../../core/market-data';
import type { CashDetailsRow, CashPositionSummary } from '../cash-details/cash-details.models';
import type { CustodianDetailsRow } from '../custodian-details/custodian-details.models';
import type {
  CashDetailsRequest,
  CashPositionRequest,
  ClientOption,
  PortfolioOption,
  PortfolioPositionRow,
  PortfolioPositioningRequest,
  PortfolioSymbolRequest,
  PortfolioTotals
} from './portfolio-positioning.models';

export function mapClientOptionsResponse(response: unknown): ClientOption[] {
  return mapArray(response).map(mapClientOption).filter((client): client is ClientOption => client !== null);
}

export function mapPortfolioOptionsResponse(response: unknown): PortfolioOption[] {
  return mapArray(response).map(mapPortfolioOption).filter((portfolio): portfolio is PortfolioOption => portfolio !== null);
}

export function mapPortfolioPositioningResponse(response: unknown): PortfolioPositionRow[] {
  return mapArray(response)
    .map(mapPortfolioPositionRow)
    .filter((row): row is PortfolioPositionRow => row !== null);
}

export function mapCustodianDetailsResponse(response: unknown): CustodianDetailsRow[] {
  return mapArray(response).map(mapCustodianDetailsRow).filter((row): row is CustodianDetailsRow => row !== null);
}

export function mapCashDetailsResponse(response: unknown): CashDetailsRow[] {
  return mapArray(response).map(mapCashDetailsRow).filter((row): row is CashDetailsRow => row !== null);
}

export function mapCashPositionSummaryResponse(response: unknown, currency: string): CashPositionSummary {
  const record = toRecord(response) ?? {};

  return {
    currency: toString(record['currency']) ?? currency,
    cashAmount: toNumber(record['cashAmount'] ?? record['cash_amount']) ?? 0,
    blocked: toNumber(record['blocked']) ?? 0,
    accountLimit: toNumber(record['accountLimit'] ?? record['account_limit']) ?? 0,
    marginableValue: toNumber(record['marginableValue'] ?? record['marginable_value']) ?? 0,
    outstandingBuyOrders: toNumber(record['outstandingBuyOrders'] ?? record['outstanding_buy_orders']) ?? 0,
    purchasePower: toNumber(record['purchasePower'] ?? record['purchase_power']) ?? 0,
    coverageRatio: toNumber(record['coverageRatio'] ?? record['coverage_ratio']) ?? 0,
    portfolioValue: toNumber(record['portfolioValue'] ?? record['portfolio_value']) ?? 0
  };
}

export function buildPositioningParams(request: PortfolioPositioningRequest): HttpParams {
  return new HttpParams().set('clientId', request.clientId).set('portfolioId', request.portfolioId);
}

export function buildSymbolParams(request: PortfolioSymbolRequest): HttpParams {
  let params = buildPositioningParams(request)
    .set('exchange', request.exchange)
    .set('symbolId', request.symbolId);

  if (request.currency) {
    params = params.set('currency', request.currency);
  }

  return params;
}

export function buildCashDetailsParams(request: CashDetailsRequest): HttpParams {
  let params = buildPositioningParams(request);

  if (request.currency) {
    params = params.set('currency', request.currency);
  }

  return params;
}

export function buildCashPositionParams(request: CashPositionRequest): HttpParams {
  return buildPositioningParams(request).set('currency', request.currency);
}

export function buildPortfolioTickTopics(rows: readonly PortfolioPositionRow[]): string[] {
  return Array.from(
    new Set(
      rows
        .filter((row) => row.exchange && row.symbolId && !row.removedFromSystem)
        .map((row) => buildTickTopic(row.exchange, row.symbolId))
    )
  );
}

export function applyTickMapToPortfolioRows(
  rows: readonly PortfolioPositionRow[],
  tickMap: Record<string, unknown>
): PortfolioPositionRow[] {
  return rows.map((row) => {
    const topic = buildTickTopic(row.exchange, row.symbolId);
    const tick = toRecord(tickMap[topic]);

    if (!tick) {
      return row;
    }

    return applyTickToPortfolioRow(row, tick);
  });
}

export function calculatePortfolioTotals(rows: readonly PortfolioPositionRow[]): PortfolioTotals {
  return rows.reduce<PortfolioTotals>(
    (totals, row) => ({
      totalCostCcc: totals.totalCostCcc + row.costCcc,
      totalMarketValueCcc: totals.totalMarketValueCcc + row.marketValueCcc,
      totalUnrealizedGainLossCcc: totals.totalUnrealizedGainLossCcc + row.unrealizedGainLossCcc
    }),
    {
      totalCostCcc: 0,
      totalMarketValueCcc: 0,
      totalUnrealizedGainLossCcc: 0
    }
  );
}

function applyTickToPortfolioRow(row: PortfolioPositionRow, tick: Record<string, unknown>): PortfolioPositionRow {
  const nextPrice = resolveTickPrice(tick);

  if (nextPrice === undefined || nextPrice === row.evaluationPrice) {
    return row;
  }

  const marketValue = row.quantity * nextPrice;
  const unrealizedGainLoss = marketValue - row.cost;
  const cccRate = resolveCccRate(row);
  const marketValueCcc = marketValue * cccRate;
  const unrealizedGainLossCcc = marketValueCcc - row.costCcc;

  return {
    ...row,
    evaluationPrice: nextPrice,
    marketValue,
    unrealizedGainLoss,
    marketValueCcc,
    unrealizedGainLossCcc,
    priceDirection: resolvePriceDirection(nextPrice, row.evaluationPrice),
    updatedAt: resolveTimestamp(tick['timestamp'])
  };
}

function mapClientOption(value: unknown): ClientOption | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const clientId = toString(record['clientId'] ?? record['id'] ?? record['code']);

  return clientId
    ? {
        clientId,
        clientName: toString(record['clientName'] ?? record['name'] ?? record['label']) ?? clientId
      }
    : null;
}

function mapPortfolioOption(value: unknown): PortfolioOption | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const portfolioId = toString(record['portfolioId'] ?? record['id'] ?? record['code']);

  return portfolioId
    ? {
        portfolioId,
        portfolioName: toString(record['portfolioName'] ?? record['name'] ?? record['label']) ?? portfolioId,
        currency: toString(record['currency']) ?? ''
      }
    : null;
}

function mapPortfolioPositionRow(value: unknown): PortfolioPositionRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const symbolId = toString(record['symbolId'] ?? record['symbol'] ?? record['id']);
  const exchange = toString(record['exchange'] ?? record['marketShortName'] ?? record['market_short_name']);

  if (!symbolId || !exchange) {
    return null;
  }

  const quantity = toNumber(record['quantity']) ?? 0;
  const evaluationPrice = toNumber(record['evaluationPrice'] ?? record['lastPrice'] ?? record['price']) ?? 0;
  const cost = toNumber(record['cost']) ?? quantity * (toNumber(record['averageCost'] ?? record['average_cost']) ?? 0);
  const marketValue = toNumber(record['marketValue'] ?? record['market_value']) ?? quantity * evaluationPrice;
  const unrealizedGainLoss =
    toNumber(record['unrealizedGainLoss'] ?? record['unrealized_gain_loss']) ?? marketValue - cost;
  const costCcc = toNumber(record['costCcc'] ?? record['costCCC'] ?? record['cost_ccc']) ?? cost;
  const marketValueCcc =
    toNumber(record['marketValueCcc'] ?? record['marketValueCCC'] ?? record['market_value_ccc']) ?? marketValue;
  const unrealizedGainLossCcc =
    toNumber(record['unrealizedGainLossCcc'] ?? record['unrealizedGainLossCCC'] ?? record['unrealized_gain_loss_ccc']) ??
    marketValueCcc - costCcc;

  return {
    marketShortName: toString(record['marketShortName'] ?? record['market_short_name']) ?? exchange,
    exchange,
    symbolId,
    symbolName: toString(record['symbolName'] ?? record['name']) ?? symbolId,
    currency: toString(record['currency']) ?? '',
    averageCost: toNumber(record['averageCost'] ?? record['average_cost']) ?? 0,
    evaluationPrice,
    quantity,
    pledged: toNumber(record['pledged']) ?? 0,
    available: toNumber(record['available']) ?? 0,
    cost,
    marketValue,
    unrealizedGainLoss,
    costCcc,
    marketValueCcc,
    unrealizedGainLossCcc,
    outstanding: toNumber(record['outstanding']) ?? 0,
    outstandingBuyUnits: toNumber(record['outstandingBuyUnits'] ?? record['outstanding_buy_units']) ?? 0,
    inTransfer: toNumber(record['inTransfer'] ?? record['in_transfer']) ?? 0,
    allocated: toNumber(record['allocated']) ?? 0,
    allocatedInTransit: toNumber(record['allocatedInTransit'] ?? record['allocated_in_transit']) ?? 0,
    availableAllocationStock: toNumber(record['availableAllocationStock'] ?? record['available_allocation_stock']) ?? 0,
    dayAllocatedQuantity: toNumber(record['dayAllocatedQuantity'] ?? record['day_allocated_quantity']) ?? 0,
    dayAllocationInTransit: toNumber(record['dayAllocationInTransit'] ?? record['day_allocation_in_transit']) ?? 0,
    outsellUnitsSameDay: toNumber(record['outsellUnitsSameDay'] ?? record['outsell_units_same_day']) ?? 0,
    outstandingBuyAmount: toNumber(record['outstandingBuyAmount'] ?? record['outstanding_buy_amount']) ?? 0,
    unsettledBuyIn: toNumber(record['unsettledBuyIn'] ?? record['unsettled_buy_in']) ?? 0,
    unsettledBuyOut: toNumber(record['unsettledBuyOut'] ?? record['unsettled_buy_out']) ?? 0,
    unsettledSellUnits: toNumber(record['unsettledSellUnits'] ?? record['unsettled_sell_units']) ?? 0,
    removedFromSystem: Boolean(record['removedFromSystem'] ?? record['removed_from_system']),
    updatedAt: resolveTimestamp(record['updatedAt'] ?? record['updated_at']),
    priceDirection: 'UNCHANGED'
  };
}

function mapCustodianDetailsRow(value: unknown): CustodianDetailsRow | null {
  const record = toRecord(value);

  return record
    ? {
        custodian: toString(record['custodian'] ?? record['custodianName'] ?? record['name']) ?? '--',
        quantity: toNumber(record['quantity']) ?? 0,
        pledged: toNumber(record['pledged']) ?? 0,
        available: toNumber(record['available']) ?? 0,
        cost: toNumber(record['cost']) ?? 0,
        marketValue: toNumber(record['marketValue'] ?? record['market_value']) ?? 0,
        unrealizedGainLoss: toNumber(record['unrealizedGainLoss'] ?? record['unrealized_gain_loss']) ?? 0,
        costCcc: toNumber(record['costCcc'] ?? record['costCCC'] ?? record['cost_ccc']) ?? 0,
        marketValueCcc: toNumber(record['marketValueCcc'] ?? record['marketValueCCC'] ?? record['market_value_ccc']) ?? 0,
        unrealizedGainLossCcc:
          toNumber(record['unrealizedGainLossCcc'] ?? record['unrealizedGainLossCCC'] ?? record['unrealized_gain_loss_ccc']) ?? 0,
        outstanding: toNumber(record['outstanding']) ?? 0,
        inTransfer: toNumber(record['inTransfer'] ?? record['in_transfer']) ?? 0
      }
    : null;
}

function mapCashDetailsRow(value: unknown): CashDetailsRow | null {
  const record = toRecord(value);

  return record
    ? {
        cashAccount: toString(record['cashAccount'] ?? record['cash_account'] ?? record['account']) ?? '--',
        cashAccountName: toString(record['cashAccountName'] ?? record['cash_account_name'] ?? record['name']) ?? '--',
        currency: toString(record['currency']) ?? '',
        group: toString(record['group']) ?? '',
        cashAmount: toNumber(record['cashAmount'] ?? record['cash_amount']) ?? 0,
        blocked: toNumber(record['blocked']) ?? 0,
        accountLimit: toNumber(record['accountLimit'] ?? record['account_limit']) ?? 0,
        purchasePower: toNumber(record['purchasePower'] ?? record['purchase_power']) ?? 0,
        coverageRatio: toNumber(record['coverageRatio'] ?? record['coverage_ratio']) ?? 0,
        buyAmountInTransit: toNumber(record['buyAmountInTransit'] ?? record['buy_amount_in_transit']) ?? 0,
        unsettledBuyUnits: toNumber(record['unsettledBuyUnits'] ?? record['unsettled_buy_units']) ?? 0,
        unsettledSellUnits: toNumber(record['unsettledSellUnits'] ?? record['unsettled_sell_units']) ?? 0,
        holdingValue: toNumber(record['holdingValue'] ?? record['holding_value']) ?? 0
      }
    : null;
}

function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const record = toRecord(response);

  if (!record) {
    return [];
  }

  for (const key of ['items', 'data', 'rows', 'results', 'portfolios', 'clients', 'positions', 'cashAccounts']) {
    if (Array.isArray(record[key])) {
      return record[key] as unknown[];
    }
  }

  return [];
}

function resolveTickPrice(tick: Record<string, unknown>): number | undefined {
  return toNumber(
    tick['lastPrice'] ??
      tick['last_price'] ??
      tick['evaluationPrice'] ??
      tick['evaluation_price'] ??
      tick['tradePrice'] ??
      tick['trade_price'] ??
      tick['price'] ??
      tick['close']
  );
}

function resolveCccRate(row: PortfolioPositionRow): number {
  if (row.marketValue > 0 && row.marketValueCcc > 0) {
    return row.marketValueCcc / row.marketValue;
  }

  if (row.cost > 0 && row.costCcc > 0) {
    return row.costCcc / row.cost;
  }

  return 1;
}

function resolvePriceDirection(nextPrice: number, previousPrice: number): 'UP' | 'DOWN' | 'UNCHANGED' {
  if (nextPrice > previousPrice) {
    return 'UP';
  }

  if (nextPrice < previousPrice) {
    return 'DOWN';
  }

  return 'UNCHANGED';
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

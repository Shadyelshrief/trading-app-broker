import { buildTickTopic } from '../../core/market-data';
import type { CashDetailsRow, CashPositionSummary } from '../cash-details/cash-details.models';
import type {
  ClientOption,
  PortfolioOption,
  PortfolioPositionRow,
  PortfolioPositioningSnapshot,
  PortfolioTotals
} from './portfolio-positioning.models';

export function mapClientOptionsResponse(response: unknown): ClientOption[] {
  return mapArray(response).map(mapClientOption).filter((client): client is ClientOption => client !== null);
}

export function mapPortfolioOptionsResponse(response: unknown): PortfolioOption[] {
  return mapArray(response).map(mapPortfolioOption).filter((portfolio): portfolio is PortfolioOption => portfolio !== null);
}

export function mapPortfolioPositioningResponse(response: unknown): PortfolioPositioningSnapshot {
  const record = toRecord(response) ?? {};
  const body = toRecord(record['body']) ?? record;
  const rows = mapArray(body['holdings'])
    .map(mapPortfolioPositionRow)
    .filter((row): row is PortfolioPositionRow => row !== null);
  const wallets = mapArray(body['wallets'])
    .map(mapWalletRow)
    .filter((row): row is CashDetailsRow => row !== null);

  return {
    rows,
    wallets,
    cashSummary: mapCashPositionSummary(body['summary'], wallets)
  };
}

export function calculateCashPositionSummary(
  wallets: readonly CashDetailsRow[],
  currency: string
): CashPositionSummary {
  const summaryCurrency = currency || resolveWalletCurrency(wallets);

  return wallets.reduce<CashPositionSummary>(
    (summary, wallet) => ({
      currency: summaryCurrency,
      totalCashAvailable: summary.totalCashAvailable + wallet.availableAmount,
      totalHoldingValue: summary.totalHoldingValue + wallet.holdingMarketValue,
      totalPurchasingPower: summary.totalPurchasingPower + wallet.purchasingPower,
      totalUnsettledBuy: summary.totalUnsettledBuy + wallet.unsettledBuyAmount,
      totalUnsettledSell: summary.totalUnsettledSell + wallet.unsettledSellAmount,
      totalPendingBuy: summary.totalPendingBuy + wallet.pendingBuyAmount,
      totalReservedSell: summary.totalReservedSell + wallet.reservedSellAmount,
      totalLimit: summary.totalLimit + wallet.limitAmount
    }),
    {
      currency: summaryCurrency,
      totalCashAvailable: 0,
      totalHoldingValue: 0,
      totalPurchasingPower: 0,
      totalUnsettledBuy: 0,
      totalUnsettledSell: 0,
      totalPendingBuy: 0,
      totalReservedSell: 0,
      totalLimit: 0
    }
  );
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
        friendlyId: toString(record['friendlyId'] ?? record['friendly_id']),
        clientName:
          toString(record['clientName'] ?? record['name'] ?? record['label'] ?? record['fullName'] ?? record['username'] ?? record['friendlyId']) ??
          clientId
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
  const exchange = toString(record['exchange'] ?? record['marketShortName'] ?? record['market_short_name'] ?? record['marketName']);

  if (!symbolId || !exchange) {
    return null;
  }

  const quantity = toNumber(record['quantity'] ?? record['totalQty']) ?? 0;
  const evaluationPrice = toNumber(record['evaluationPrice'] ?? record['lastPrice'] ?? record['price']) ?? 0;
  const averageCost = toNumber(record['averageCost'] ?? record['average_cost'] ?? record['costPrice']) ?? 0;
  const cost = toNumber(record['cost']) ?? quantity * averageCost;
  const marketValue = toNumber(record['marketValue'] ?? record['market_value']) ?? quantity * evaluationPrice;
  const unrealizedGainLoss =
    toNumber(record['unrealizedGainLoss'] ?? record['unrealized_gain_loss'] ?? record['unrealizedPnl']) ?? marketValue - cost;
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
    symbolName: toString(record['symbolName'] ?? record['name'] ?? record['productName']) ?? symbolId,
    currency: resolveHoldingCurrency(record, exchange),
    averageCost,
    evaluationPrice,
    quantity,
    pledged: toNumber(record['pledged']) ?? 0,
    available: toNumber(record['available'] ?? record['availableQty']) ?? 0,
    cost,
    marketValue,
    unrealizedGainLoss,
    costCcc,
    marketValueCcc,
    unrealizedGainLossCcc,
    outstanding: toNumber(record['outstanding']) ?? 0,
    outstandingBuyUnits: toNumber(record['outstandingBuyUnits'] ?? record['outstanding_buy_units'] ?? record['pendingBuyQty']) ?? 0,
    inTransfer: toNumber(record['inTransfer'] ?? record['in_transfer']) ?? 0,
    allocated: toNumber(record['allocated']) ?? 0,
    allocatedInTransit: toNumber(record['allocatedInTransit'] ?? record['allocated_in_transit']) ?? 0,
    availableAllocationStock: toNumber(record['availableAllocationStock'] ?? record['available_allocation_stock']) ?? 0,
    dayAllocatedQuantity: toNumber(record['dayAllocatedQuantity'] ?? record['day_allocated_quantity']) ?? 0,
    dayAllocationInTransit: toNumber(record['dayAllocationInTransit'] ?? record['day_allocation_in_transit']) ?? 0,
    outsellUnitsSameDay: toNumber(record['outsellUnitsSameDay'] ?? record['outsell_units_same_day']) ?? 0,
    outstandingBuyAmount: toNumber(record['outstandingBuyAmount'] ?? record['outstanding_buy_amount']) ?? 0,
    unsettledBuyIn: toNumber(record['unsettledBuyIn'] ?? record['unsettled_buy_in'] ?? record['unsettledBuyQty']) ?? 0,
    unsettledBuyOut: toNumber(record['unsettledBuyOut'] ?? record['unsettled_buy_out']) ?? 0,
    unsettledSellUnits: toNumber(record['unsettledSellUnits'] ?? record['unsettled_sell_units'] ?? record['unsettledSellQty']) ?? 0,
    removedFromSystem: Boolean(record['removedFromSystem'] ?? record['removed_from_system']),
    updatedAt: resolveTimestamp(record['updatedAt'] ?? record['updated_at']),
    priceDirection: 'UNCHANGED'
  };
}

function resolveHoldingCurrency(record: Record<string, unknown>, exchange: string): string {
  const explicitCurrency = toString(
    record['currencyCode'] ??
      record['currency_code'] ??
      record['currencyShortName'] ??
      record['currency_short_name'] ??
      record['currency']
  )?.toUpperCase();

  if (explicitCurrency && /^[A-Z]{3}$/.test(explicitCurrency)) {
    return explicitCurrency;
  }

  const normalizedMarket = exchange.trim().toUpperCase();

  if (
    normalizedMarket === 'ADX' ||
    normalizedMarket === 'DFM' ||
    normalizedMarket.includes('ABU DHABI') ||
    normalizedMarket.includes('DUBAI')
  ) {
    return 'AED';
  }

  if (normalizedMarket === 'TADAWUL' || normalizedMarket.includes('SAUDI')) {
    return 'SAR';
  }

  // The current holdings contract exposes currencyId as a UUID without a
  // currency-code lookup. All currently supported holdings are AED.
  return toString(record['currencyId'] ?? record['currency_id']) ? 'AED' : '';
}

function mapWalletRow(value: unknown): CashDetailsRow | null {
  const record = toRecord(value);

  if (!record) {
    return null;
  }

  const walletName =
    toString(record['walletName'] ?? record['wallet_name'] ?? record['cashAccountName'] ?? record['name']) ?? '--';

  return {
    walletId: toString(record['walletId'] ?? record['wallet_id'] ?? record['cashAccount'] ?? record['cash_account']) ?? '--',
    walletName,
    currency:
      toString(record['currency'] ?? record['currencyCode'] ?? record['currency_code']) ??
      inferCurrencyFromWalletName(walletName),
    isMargin: Boolean(record['isMargin'] ?? record['is_margin']),
    availableAmount: toNumber(record['availableAmount'] ?? record['available_amount'] ?? record['cashAmount']) ?? 0,
    blockedAmount: toNumber(record['blockedAmount'] ?? record['blocked_amount'] ?? record['blocked']) ?? 0,
    coverRatio: toNumber(record['coverRatio'] ?? record['cover_ratio'] ?? record['coverageRatio']) ?? 0,
    holdingMarketValue: toNumber(record['holdingMarketValue'] ?? record['holding_market_value'] ?? record['holdingValue']) ?? 0,
    limitAmount: toNumber(record['limitAmount'] ?? record['limit_amount'] ?? record['accountLimit']) ?? 0,
    marginableValue: toNumber(record['marginableValue'] ?? record['marginable_value']) ?? 0,
    pendingBuyAmount: toNumber(record['pendingBuyAmount'] ?? record['pending_buy_amount'] ?? record['buyAmountInTransit']) ?? 0,
    ppMargin: toNumber(record['ppMargin'] ?? record['pp_margin']) ?? 0,
    purchasingPower: toNumber(record['purchasingPower'] ?? record['purchasing_power'] ?? record['purchasePower']) ?? 0,
    reservedSellAmount:
      toNumber(
        record['reservedSellAmount'] ??
          record['reserved_sell_amount'] ??
          record['reservedSellValue'] ??
          record['reserved_sell_value']
      ) ?? 0,
    unsettledBuyAmount: toNumber(record['unsettledBuyAmount'] ?? record['unsettled_buy_amount'] ?? record['unsettledBuyUnits']) ?? 0,
    unsettledSellAmount: toNumber(record['unsettledSellAmount'] ?? record['unsettled_sell_amount'] ?? record['unsettledSellUnits']) ?? 0
  };
}

function mapCashPositionSummary(value: unknown, wallets: readonly CashDetailsRow[]): CashPositionSummary {
  const record = toRecord(value);
  const fallback = calculateCashPositionSummary(wallets, '');

  return {
    currency:
      toString(record?.['currency'] ?? record?.['currencyCode'] ?? record?.['currency_code']) ??
      fallback.currency,
    totalCashAvailable: toNumber(record?.['totalCashAvailable'] ?? record?.['total_cash_available']) ?? fallback.totalCashAvailable,
    totalHoldingValue: toNumber(record?.['totalHoldingValue'] ?? record?.['total_holding_value']) ?? fallback.totalHoldingValue,
    totalPurchasingPower: toNumber(record?.['totalPurchasingPower'] ?? record?.['total_purchasing_power']) ?? fallback.totalPurchasingPower,
    totalUnsettledBuy: toNumber(record?.['totalUnsettledBuy'] ?? record?.['total_unsettled_buy']) ?? fallback.totalUnsettledBuy,
    totalUnsettledSell: toNumber(record?.['totalUnsettledSell'] ?? record?.['total_unsettled_sell']) ?? fallback.totalUnsettledSell,
    totalPendingBuy: toNumber(record?.['totalPendingBuy'] ?? record?.['total_pending_buy']) ?? fallback.totalPendingBuy,
    totalReservedSell: toNumber(record?.['totalReservedSell'] ?? record?.['total_reserved_sell']) ?? fallback.totalReservedSell,
    totalLimit: toNumber(record?.['totalLimit'] ?? record?.['total_limit']) ?? fallback.totalLimit
  };
}

function resolveWalletCurrency(wallets: readonly CashDetailsRow[]): string {
  const currencies = Array.from(new Set(wallets.map((wallet) => wallet.currency).filter(Boolean)));
  return currencies.length === 1 ? currencies[0] : '';
}

function inferCurrencyFromWalletName(walletName: string): string {
  const match = walletName.toUpperCase().match(/(?:^|\s)([A-Z]{3})(?:\s|$)/);
  return match?.[1] ?? '';
}

function mapArray(response: unknown): unknown[] {
  if (Array.isArray(response)) {
    return response;
  }

  const record = toRecord(response);

  if (!record) {
    return [];
  }

  for (const key of ['body', 'items', 'data', 'rows', 'results', 'portfolios', 'clients', 'positions', 'holdings', 'wallets', 'cashAccounts']) {
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

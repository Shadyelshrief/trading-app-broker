import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { OrderStatisticsRow } from '../services/order.models';

export function createOrderStatisticsColumns(): ColDef<OrderStatisticsRow>[] {
  return [
    numberColumn('Order Count', 'orderCount', 140),
    moneyColumn('Total Sell Value Active', 'totalSellValueActive', 210),
    moneyColumn('Total Sell Value Executed', 'totalSellValueExecuted', 225),
    numberColumn('Total Sell Quantity Active', 'totalSellQuantityActive', 225),
    numberColumn('Total Sell Quantity Executed', 'totalSellQuantityExecuted', 245),
    moneyColumn('Total Buy Value Active', 'totalBuyValueActive', 205),
    moneyColumn('Total Buy Value Executed', 'totalBuyValueExecuted', 225),
    numberColumn('Total Buy Quantity Active', 'totalBuyQuantityActive', 225),
    numberColumn('Total Buy Quantity Executed', 'totalBuyQuantityExecuted', 245),
    moneyColumn('Total Commission', 'totalCommission', 170),
    { headerName: 'Currency', field: 'currency', minWidth: 115 },
    moneyColumn('Net Position Active', 'netPositionActive', 185),
    moneyColumn('Net Position Executed', 'netPositionExecuted', 205)
  ];
}

function moneyColumn(headerName: string, field: keyof OrderStatisticsRow, minWidth: number): ColDef<OrderStatisticsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: moneyFormatter, cellClass: netClass };
}

function numberColumn(headerName: string, field: keyof OrderStatisticsRow, minWidth: number): ColDef<OrderStatisticsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: numberFormatter };
}

function netClass(params: { value?: unknown; colDef?: ColDef<OrderStatisticsRow> }): string {
  if (!`${params.colDef?.field ?? ''}`.startsWith('net')) {
    return '';
  }
  const value = typeof params.value === 'number' ? params.value : 0;
  return value > 0 ? 'market-cell--up' : value < 0 ? 'market-cell--down' : 'market-cell--flat';
}

function moneyFormatter(params: ValueFormatterParams<OrderStatisticsRow, number>): string {
  return formatNumber(params.value, 2);
}

function numberFormatter(params: ValueFormatterParams<OrderStatisticsRow, number>): string {
  return formatNumber(params.value, 0);
}

function formatNumber(value: number | null | undefined, digits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value ?? 0);
}

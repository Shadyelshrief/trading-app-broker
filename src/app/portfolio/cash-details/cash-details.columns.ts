import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { CashDetailsRow } from './cash-details.models';

export function createCashDetailsColumns(): ColDef<CashDetailsRow>[] {
  return [
    { headerName: 'Wallet ID', field: 'walletId', minWidth: 250, pinned: 'left' },
    { headerName: 'Wallet Name', field: 'walletName', minWidth: 180 },
    { headerName: 'Currency', field: 'currency', minWidth: 110 },
    { headerName: 'Wallet Type', field: 'isMargin', minWidth: 130, valueFormatter: (params) => params.value ? 'Margin' : 'Cash' },
    moneyColumn('Available Amount', 'availableAmount', 170),
    moneyColumn('Blocked Amount', 'blockedAmount', 160),
    moneyColumn('Limit Amount', 'limitAmount', 145),
    moneyColumn('Purchasing Power', 'purchasingPower', 170),
    percentColumn('Cover Ratio', 'coverRatio', 140),
    moneyColumn('Holding Market Value', 'holdingMarketValue', 195),
    moneyColumn('Marginable Value', 'marginableValue', 170),
    moneyColumn('Pending Buy Amount', 'pendingBuyAmount', 185),
    moneyColumn('Reserved Sell Amount', 'reservedSellAmount', 190),
    moneyColumn('PP Margin', 'ppMargin', 140),
    moneyColumn('Unsettled Buy Amount', 'unsettledBuyAmount', 195),
    moneyColumn('Unsettled Sell Amount', 'unsettledSellAmount', 200)
  ];
}

function moneyColumn(headerName: string, field: keyof CashDetailsRow, minWidth: number): ColDef<CashDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: moneyFormatter };
}

function percentColumn(headerName: string, field: keyof CashDetailsRow, minWidth: number): ColDef<CashDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: percentFormatter };
}

function moneyFormatter(params: ValueFormatterParams<CashDetailsRow, number>): string {
  return formatNumber(params.value, 2);
}

function percentFormatter(params: ValueFormatterParams<CashDetailsRow, number>): string {
  return `${formatNumber(params.value, 2)}%`;
}

function formatNumber(value: number | null | undefined, digits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value ?? 0);
}

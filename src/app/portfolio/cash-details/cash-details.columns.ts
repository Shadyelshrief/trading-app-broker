import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { CashDetailsRow } from './cash-details.models';

export function createCashDetailsColumns(): ColDef<CashDetailsRow>[] {
  return [
    { headerName: 'Cash Account', field: 'cashAccount', minWidth: 155, pinned: 'left' },
    { headerName: 'Cash Account Name', field: 'cashAccountName', minWidth: 220 },
    { headerName: 'Currency', field: 'currency', minWidth: 110 },
    { headerName: 'Group', field: 'group', minWidth: 125 },
    moneyColumn('Cash Amount', 'cashAmount', 150),
    moneyColumn('Blocked', 'blocked', 130),
    moneyColumn('Account Limit', 'accountLimit', 150),
    moneyColumn('Purchase Power', 'purchasePower', 165),
    percentColumn('Coverage Ratio', 'coverageRatio', 155),
    moneyColumn('Buy Amount In Transit', 'buyAmountInTransit', 200),
    numberColumn('Unsettled Buy Units', 'unsettledBuyUnits', 180),
    numberColumn('Unsettled Sell Units', 'unsettledSellUnits', 185),
    moneyColumn('Holding Value', 'holdingValue', 150)
  ];
}

function moneyColumn(headerName: string, field: keyof CashDetailsRow, minWidth: number): ColDef<CashDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: moneyFormatter };
}

function numberColumn(headerName: string, field: keyof CashDetailsRow, minWidth: number): ColDef<CashDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: integerFormatter };
}

function percentColumn(headerName: string, field: keyof CashDetailsRow, minWidth: number): ColDef<CashDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: percentFormatter };
}

function moneyFormatter(params: ValueFormatterParams<CashDetailsRow, number>): string {
  return formatNumber(params.value, 2);
}

function integerFormatter(params: ValueFormatterParams<CashDetailsRow, number>): string {
  return formatNumber(params.value, 0);
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

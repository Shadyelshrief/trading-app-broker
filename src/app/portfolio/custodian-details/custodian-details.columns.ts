import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { CustodianDetailsRow } from './custodian-details.models';

export function createCustodianDetailsColumns(): ColDef<CustodianDetailsRow>[] {
  return [
    { headerName: 'Custodian', field: 'custodian', minWidth: 180, pinned: 'left' },
    numberColumn('Quantity', 'quantity', 130),
    numberColumn('Pledged', 'pledged', 120),
    numberColumn('Available', 'available', 130),
    moneyColumn('Cost', 'cost', 130),
    moneyColumn('Market Value', 'marketValue', 150),
    gainLossColumn('Unrealized Gain/Loss', 'unrealizedGainLoss', 190),
    moneyColumn('Cost (CCC)', 'costCcc', 145),
    moneyColumn('Market Value (CCC)', 'marketValueCcc', 185),
    gainLossColumn('Unrealized Gain/Loss (CCC)', 'unrealizedGainLossCcc', 230),
    numberColumn('Outstanding', 'outstanding', 145),
    numberColumn('In Transfer', 'inTransfer', 140)
  ];
}

function moneyColumn(headerName: string, field: keyof CustodianDetailsRow, minWidth: number): ColDef<CustodianDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: moneyFormatter };
}

function numberColumn(headerName: string, field: keyof CustodianDetailsRow, minWidth: number): ColDef<CustodianDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: integerFormatter };
}

function gainLossColumn(headerName: string, field: keyof CustodianDetailsRow, minWidth: number): ColDef<CustodianDetailsRow> {
  return { headerName, field, minWidth, type: 'rightAligned', valueFormatter: moneyFormatter, cellClass: gainLossCellClass };
}

function gainLossCellClass(params: { value?: unknown }): string {
  const value = typeof params.value === 'number' ? params.value : 0;
  return value > 0 ? 'market-cell--up' : value < 0 ? 'market-cell--down' : 'market-cell--flat';
}

function moneyFormatter(params: ValueFormatterParams<CustodianDetailsRow, number>): string {
  return formatNumber(params.value, 2);
}

function integerFormatter(params: ValueFormatterParams<CustodianDetailsRow, number>): string {
  return formatNumber(params.value, 0);
}

function formatNumber(value: number | null | undefined, digits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value ?? 0);
}

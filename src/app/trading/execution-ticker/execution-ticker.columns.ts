import { ColDef } from 'ag-grid-community';

import { ExecutionTickerRow } from './execution-ticker.models';

export function createExecutionTickerColumns(): ColDef<ExecutionTickerRow>[] {
  return [
    textColumn('Market Name', 'marketName', 190),
    textColumn('Order Number', 'orderNumber', 160),
    textColumn('Symbol', 'symbolId', 120, sideClass),
    textColumn('Symbol Name', 'symbolName', 200, sideClass),
    textColumn('Currency', 'currency', 110),
    textColumn('Portfolio Number', 'portfolioNumber', 160),
    textColumn('Client ID', 'clientId', 130),
    textColumn('Client Name', 'clientName', 190),
    textColumn('Order Side', 'orderSide', 130, sideClass),
    textColumn('Transaction Type', 'transactionType', 170),
    {
      headerName: 'Price',
      field: 'price',
      width: 130,
      cellClass: sideClass,
      valueFormatter: (params) => formatPrice(params.value)
    },
    {
      headerName: 'Quantity',
      field: 'quantity',
      width: 130,
      type: 'rightAligned',
      cellClass: sideClass,
      valueFormatter: (params) => formatNumber(params.value)
    },
    {
      headerName: 'Remaining Quantity',
      field: 'remainingQuantity',
      width: 180,
      type: 'rightAligned',
      valueFormatter: (params) => formatNumber(params.value)
    }
  ];
}

function textColumn(
  headerName: string,
  field: keyof ExecutionTickerRow,
  width: number,
  cellClass?: (params: { data?: ExecutionTickerRow }) => string
): ColDef<ExecutionTickerRow> {
  return {
    headerName,
    field,
    width,
    cellClass
  };
}

function sideClass(params: { data?: ExecutionTickerRow }): string {
  return params.data?.orderSide === 'SELL' ? 'execution-cell--sell' : 'execution-cell--buy';
}

function formatNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
    : '--';
}

function formatPrice(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(value);
  }

  return typeof value === 'string' && value ? value : '--';
}

import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { SecurityPerformanceRow } from '../services/market-performance.service';

export function createSecurityPerformanceColumns(): ColDef<SecurityPerformanceRow>[] {
  return [
    { headerName: 'Trading Date', field: 'tradingDate', minWidth: 145, pinned: 'left' },
    {
      headerName: 'Closing Price',
      field: 'closingPrice',
      minWidth: 150,
      cellClass: directionCellClass,
      valueFormatter: numberFormatter
    },
    { headerName: 'Open Price', field: 'openPrice', minWidth: 135, valueFormatter: numberFormatter },
    { headerName: 'Change', field: 'change', minWidth: 120, cellClass: directionCellClass, valueFormatter: numberFormatter },
    {
      headerName: 'Change %',
      field: 'changePercent',
      minWidth: 125,
      cellClass: directionCellClass,
      valueFormatter: percentFormatter
    },
    {
      headerName: 'Change Direction',
      field: 'changeDirection',
      minWidth: 155,
      cellClass: directionCellClass,
      valueFormatter: directionFormatter
    },
    { headerName: 'Currency', field: 'currency', minWidth: 110 },
    { headerName: 'High Price', field: 'highPrice', minWidth: 130, valueFormatter: numberFormatter },
    { headerName: 'Low Price', field: 'lowPrice', minWidth: 130, valueFormatter: numberFormatter },
    { headerName: 'Trades', field: 'trades', minWidth: 120, valueFormatter: integerFormatter },
    { headerName: 'Volume Traded', field: 'volumeTraded', minWidth: 155, valueFormatter: integerFormatter }
  ];
}

function directionCellClass(params: { data?: SecurityPerformanceRow }): string {
  switch (params.data?.changeDirection) {
    case 'UP':
      return 'market-cell--up';
    case 'DOWN':
      return 'market-cell--down';
    default:
      return 'market-cell--flat';
  }
}

function numberFormatter(params: ValueFormatterParams<SecurityPerformanceRow, number>): string {
  return formatNumber(params.value, 4);
}

function integerFormatter(params: ValueFormatterParams<SecurityPerformanceRow, number>): string {
  return formatNumber(params.value, 0);
}

function percentFormatter(params: ValueFormatterParams<SecurityPerformanceRow, number>): string {
  const value = params.value ?? 0;
  return `${value >= 0 ? '+' : ''}${formatNumber(value, 2)}%`;
}

function directionFormatter(params: ValueFormatterParams<SecurityPerformanceRow, string>): string {
  switch (params.value) {
    case 'UP':
      return '▲ Up';
    case 'DOWN':
      return '▼ Down';
    default:
      return '■ Unchanged';
  }
}

function formatNumber(value: number | null | undefined, fractionDigits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  }).format(value ?? 0);
}

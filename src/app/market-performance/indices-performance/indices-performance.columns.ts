import { ColDef } from 'ag-grid-community';

import { IndexPerformanceRow } from '../services/market-performance.service';

export function createIndicesPerformanceColumns(): ColDef<IndexPerformanceRow>[] {
  return [
    { headerName: 'Trading Date', field: 'tradingDate', width: 150 },
    { headerName: 'Closing Index', field: 'closingIndex', width: 150, type: 'rightAligned', valueFormatter: (p) => price(p.value), cellClass: directionClass },
    { headerName: 'Open Index', field: 'openIndex', width: 140, type: 'rightAligned', valueFormatter: (p) => price(p.value) },
    { headerName: 'Change', field: 'change', width: 120, type: 'rightAligned', valueFormatter: (p) => signed(p.value), cellClass: directionClass },
    { headerName: 'Change %', field: 'changePercent', width: 130, type: 'rightAligned', valueFormatter: (p) => `${signed(p.value)}%`, cellClass: directionClass },
    { headerName: 'Change Direction', field: 'changeDirection', width: 160, cellClass: directionClass },
    { headerName: 'High Price', field: 'highPrice', width: 130, type: 'rightAligned', valueFormatter: (p) => price(p.value) },
    { headerName: 'Low Price', field: 'lowPrice', width: 130, type: 'rightAligned', valueFormatter: (p) => price(p.value) }
  ];
}

function directionClass(params: { data?: IndexPerformanceRow }): string {
  switch (params.data?.changeDirection) {
    case 'UP':
      return 'market-cell--up';
    case 'DOWN':
      return 'market-cell--down';
    default:
      return 'market-cell--flat';
  }
}

function price(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value)
    : '--';
}

function signed(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return `${value > 0 ? '+' : ''}${price(value)}`;
}

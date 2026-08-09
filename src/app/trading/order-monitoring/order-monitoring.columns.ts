import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { OrderMonitoringRow } from '../services/order.models';

export function createOrderMonitoringColumns(): ColDef<OrderMonitoringRow>[] {
  return [
    { headerName: 'Order Number', field: 'orderNumber', minWidth: 150, pinned: 'left' },
    { headerName: 'Client ID', field: 'clientFriendlyId', minWidth: 130 },
    { headerName: 'Client Name', field: 'clientName', minWidth: 190 },
    { headerName: 'Portfolio', field: 'portfolio', minWidth: 150 },
    { headerName: 'Status', field: 'status', minWidth: 180, cellClass: statusClass },
    { headerName: 'Order Type', field: 'orderType', minWidth: 140 },
    { headerName: 'Symbol ID', field: 'symbolId', minWidth: 130, cellClass: symbolClass },
    { headerName: 'Symbol Name', field: 'symbolName', minWidth: 210, cellClass: symbolClass },
    { headerName: 'Price', field: 'price', minWidth: 120, valueFormatter: priceFormatter },
    { headerName: 'Currency', field: 'currency', minWidth: 110 },
    { headerName: 'Quantity', field: 'quantity', minWidth: 130, valueFormatter: numberFormatter },
    { headerName: 'Executed Quantity', field: 'executedQuantity', minWidth: 170, valueFormatter: numberFormatter },
    { headerName: 'Remaining Quantity', field: 'remainingQuantity', minWidth: 180, valueFormatter: numberFormatter },
    { headerName: 'Expiry Date', field: 'expiryDate', minWidth: 140 }
  ];
}

function symbolClass(params: { data?: OrderMonitoringRow }): string {
  return params.data?.removedFromSystem ? 'order-cell--removed' : '';
}

function statusClass(params: { value?: unknown }): string {
  const value = `${params.value ?? ''}`.toUpperCase();
  if (value.includes('REJECT') || value.includes('CANCEL') || value.includes('EXPIRED')) {
    return 'market-cell--down';
  }
  if (value.includes('EXECUTED') || value.includes('ACCEPTED') || value.includes('PLACED')) {
    return 'market-cell--up';
  }
  return 'market-cell--flat';
}

function priceFormatter(params: ValueFormatterParams<OrderMonitoringRow, number | string>): string {
  return typeof params.value === 'number' ? formatNumber(params.value, 3) : `${params.value ?? '--'}`;
}

function numberFormatter(params: ValueFormatterParams<OrderMonitoringRow, number>): string {
  return formatNumber(params.value, 0);
}

function formatNumber(value: number | null | undefined, digits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value ?? 0);
}

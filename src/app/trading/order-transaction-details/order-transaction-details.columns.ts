import { ColDef } from 'ag-grid-community';

import { OrderTransactionHistoryRow } from './order-transaction-details.models';

export function createOrderTransactionHistoryColumns(): ColDef<OrderTransactionHistoryRow>[] {
  return [
    { headerName: 'Serial No.', field: 'serialNo', width: 110 },
    { headerName: 'Transaction Time', field: 'transactionTime', width: 180 },
    { headerName: 'Type', field: 'type', width: 140 },
    { headerName: 'Expiry Date', field: 'expiryDate', width: 150 },
    { headerName: 'Quantity', field: 'quantity', width: 130, type: 'rightAligned', valueFormatter: (p) => formatNumber(p.value) },
    { headerName: 'Price', field: 'price', width: 130, type: 'rightAligned', valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Fees', field: 'fees', width: 120, type: 'rightAligned', valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Trading Amount', field: 'tradingAmount', width: 160, type: 'rightAligned', valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Order Amount', field: 'orderAmount', width: 150, type: 'rightAligned', valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Average Price', field: 'averagePrice', width: 150, type: 'rightAligned', valueFormatter: (p) => formatPrice(p.value) },
    { headerName: 'Status', field: 'status', width: 140 },
    { headerName: 'Delivered', field: 'delivered', width: 130 },
    { headerName: 'Session', field: 'session', width: 150 }
  ];
}

function formatNumber(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value)
    : '--';
}

function formatPrice(value: unknown): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(value)
    : typeof value === 'string' && value
      ? value
      : '--';
}

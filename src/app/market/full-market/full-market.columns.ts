import { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';

import { FullMarketRow } from '../models/full-market-row.model';
import { getDirectionClass } from '../utils/direction.util';
import { formatCompactNumber, formatPercent, formatPrice, formatQuantity } from '../utils/formatters';

const price = (params: ValueFormatterParams<FullMarketRow, number>) => formatPrice(params.value);
const quantity = (params: ValueFormatterParams<FullMarketRow, number>) => formatQuantity(params.value);
const percent = (params: ValueFormatterParams<FullMarketRow, number>) => formatPercent(params.value);
const compact = (params: ValueFormatterParams<FullMarketRow, number>) => formatCompactNumber(params.value);

export function createFullMarketColumns(): ColDef<FullMarketRow>[] {
  return [
    { headerName: 'Symbol ID', field: 'symbolId', pinned: 'left', minWidth: 120, cellClass: directionCellClass },
    { headerName: 'Symbol Name', field: 'symbolName', pinned: 'left', minWidth: 160, cellClass: directionCellClass },
    {
      headerName: 'Remarks',
      field: 'status',
      minWidth: 90,
      maxWidth: 90,
      sortable: false,
      filter: false,
      suppressHeaderMenuButton: true,
      tooltipValueGetter: remarksTooltip,
      cellRenderer: suspendedRemarkRenderer
    },
    { headerName: 'Market', field: 'market', minWidth: 110 },
    { headerName: 'Sector', field: 'sector', minWidth: 130 },
    { headerName: 'Bid Price', field: 'bidPrice', cellClass: 'market-cell--bid', valueFormatter: price },
    { headerName: 'Bid Quantity', field: 'bidQty', cellClass: 'market-cell--bid', valueFormatter: quantity },
    { headerName: 'Offer Price', field: 'offerPrice', cellClass: 'market-cell--offer', valueFormatter: price },
    { headerName: 'Offer Quantity', field: 'offerQty', cellClass: 'market-cell--offer', valueFormatter: quantity },
    { headerName: 'Last Price', field: 'lastPrice', valueFormatter: price, cellClass: directionCellClass },
    { headerName: 'Last Trade Quantity', field: 'lastTradeQty', valueFormatter: quantity },
    { headerName: 'Last Trade Time', field: 'lastTradeTime', minWidth: 130 },
    { headerName: 'Change', field: 'change', valueFormatter: price, cellClass: directionCellClass },
    { headerName: 'Change %', field: 'changePercent', valueFormatter: percent, cellClass: directionCellClass },
    { headerName: 'Change Direction', field: 'direction', minWidth: 140, cellClass: directionCellClass },
    { headerName: 'Open Price', field: 'openPrice', valueFormatter: price },
    { headerName: 'Previous Closed', field: 'previousClose', valueFormatter: price },
    { headerName: 'High Price', field: 'highPrice', valueFormatter: price },
    { headerName: 'Low Price', field: 'lowPrice', valueFormatter: price },
    { headerName: 'Average Price', field: 'averagePrice', valueFormatter: price },
    { headerName: 'Number Of Trades', field: 'numberOfTrades', valueFormatter: quantity },
    { headerName: 'Total Volume', field: 'totalVolume', valueFormatter: quantity },
    { headerName: 'Turnover', field: 'turnover', valueFormatter: compact },
    { headerName: '52 Weeks High', field: 'week52High', valueFormatter: price },
    { headerName: '52 Weeks Low', field: 'week52Low', valueFormatter: price },
    { headerName: 'PER', field: 'peRatio', valueFormatter: price },
    { headerName: 'PBR', field: 'pbRatio', valueFormatter: price },
    { headerName: 'Market Capitalization', field: 'marketCap', valueFormatter: compact, minWidth: 170 },
    { headerName: 'Yield', field: 'yield', valueFormatter: percent },
    { headerName: 'Trade Price', field: 'tradePrice', valueFormatter: price },
    { headerName: 'Trade Quantity', field: 'tradeQuantity', valueFormatter: quantity },
    { headerName: 'Tolerance High', field: 'toleranceHigh', valueFormatter: price },
    { headerName: 'Tolerance Low', field: 'toleranceLow', valueFormatter: price },
    { headerName: 'Total Bid Qty', field: 'totalBidQty', valueFormatter: quantity },
    { headerName: 'Total Offer Qty', field: 'totalOfferQty', valueFormatter: quantity },
    { headerName: 'Ratio (Offer/Bid)', field: 'ratio', valueFormatter: price, minWidth: 150 },
    { headerName: 'Currency', field: 'currency', minWidth: 100 }
  ];
}

function directionCellClass(params: ValueFormatterParams<FullMarketRow, number | string>): string {
  return getDirectionClass(params.data?.direction ?? 'UNCHANGED');
}

function remarksTooltip(params: { data?: FullMarketRow | null }): string {
  const status = params.data?.status?.trim();

  if (!status || !isSuspendedStatus(status)) {
    return '';
  }

  return normalizeStatusLabel(status);
}

function suspendedRemarkRenderer(params: ICellRendererParams<FullMarketRow>): string {
  const status = params.data?.status?.trim();

  if (!status || !isSuspendedStatus(status)) {
    return '';
  }

  const label = normalizeStatusLabel(status);

  return `<span title="${label}" style="display:inline-flex;width:0.65rem;height:0.65rem;border-radius:50%;background:#ff6b6b;box-shadow:0 0 0 4px rgba(255,107,107,0.18);"></span>`;
}

function isSuspendedStatus(status: string): boolean {
  const normalized = status.trim().toUpperCase();
  return normalized === 'SUSPENDED' || normalized === 'HALTED';
}

function normalizeStatusLabel(status: string): string {
  return status
    .trim()
    .toLowerCase()
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

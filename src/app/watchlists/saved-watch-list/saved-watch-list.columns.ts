import { ColDef, ICellRendererParams, ValueFormatterParams } from 'ag-grid-community';

import { getDirectionClass } from '../../market/utils/direction.util';
import { formatCompactNumber, formatPercent, formatPrice, formatQuantity } from '../../market/utils/formatters';
import { WatchListRow } from './saved-watch-list.models';

const price = (params: ValueFormatterParams<WatchListRow, number>) => formatPrice(params.value);
const quantity = (params: ValueFormatterParams<WatchListRow, number>) => formatQuantity(params.value);
const percent = (params: ValueFormatterParams<WatchListRow, number>) => formatPercent(params.value);
const compact = (params: ValueFormatterParams<WatchListRow, number>) => formatCompactNumber(params.value);

export function createSavedWatchListColumns(): ColDef<WatchListRow>[] {
  return [
    { headerName: 'Market Name', field: 'marketName', minWidth: 210 },
    { headerName: 'Market Short Name', field: 'marketShortName', minWidth: 150 },
    { headerName: 'Symbol Name', field: 'symbolName', pinned: 'left', minWidth: 210, cellClass: directionCellClass },
    { headerName: 'Symbol Short Name', field: 'symbolShortName', minWidth: 160, cellClass: directionCellClass },
    { headerName: 'ID', field: 'symbolId', pinned: 'left', minWidth: 110, cellClass: directionCellClass },
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
    { headerName: 'Bid Price', field: 'bidPrice', cellClass: 'market-cell--bid', valueFormatter: price },
    { headerName: 'Bid Size', field: 'bidSize', cellClass: 'market-cell--bid', valueFormatter: quantity },
    { headerName: 'Offer Price', field: 'offerPrice', cellClass: 'market-cell--offer', valueFormatter: price },
    { headerName: 'Offer Size', field: 'offerSize', cellClass: 'market-cell--offer', valueFormatter: quantity },
    { headerName: 'Open Price', field: 'openPrice', valueFormatter: price },
    { headerName: 'Last Price', field: 'lastPrice', valueFormatter: price, cellClass: directionCellClass },
    { headerName: 'Last Trade Quantity', field: 'lastTradeQty', valueFormatter: quantity },
    { headerName: 'Last Trade Time', field: 'lastTradeTime', minWidth: 140 },
    { headerName: 'Change %', field: 'changePercent', valueFormatter: percent, cellClass: directionCellClass },
    { headerName: 'Change Direction', field: 'changeDirection', minWidth: 150, cellClass: directionCellClass },
    { headerName: 'Previous Closed', field: 'previousClosed', valueFormatter: price },
    { headerName: 'High Price', field: 'highPrice', valueFormatter: price },
    { headerName: 'Low Price', field: 'lowPrice', valueFormatter: price },
    { headerName: 'Average Price', field: 'averagePrice', valueFormatter: price },
    { headerName: 'Number Of Trades', field: 'numberOfTrades', valueFormatter: quantity },
    { headerName: 'Total Volume', field: 'totalVolume', valueFormatter: quantity },
    { headerName: 'Turnover', field: 'turnover', valueFormatter: compact },
    { headerName: '52 Weeks High', field: 'week52High', valueFormatter: price },
    { headerName: '52 Weeks Low', field: 'week52Low', valueFormatter: price },
    { headerName: 'Price/Earnings Ratio', field: 'peRatio', valueFormatter: price, minWidth: 170 },
    { headerName: 'Market Capitalization', field: 'marketCapitalization', valueFormatter: compact, minWidth: 180 },
    { headerName: 'Price Book Ratio', field: 'pbRatio', valueFormatter: price, minWidth: 160 },
    { headerName: 'Yield', field: 'yield', valueFormatter: percent },
    { headerName: 'Change', field: 'change', valueFormatter: price, cellClass: directionCellClass },
    { headerName: 'Trade Price', field: 'tradePrice', valueFormatter: price },
    { headerName: 'Trade Quantity', field: 'tradeQty', valueFormatter: quantity },
    { headerName: 'Tolerance High', field: 'toleranceHigh', valueFormatter: price },
    { headerName: 'Tolerance Low', field: 'toleranceLow', valueFormatter: price },
    { headerName: 'Total Bid Quantity', field: 'totalBidQty', valueFormatter: quantity, minWidth: 170 },
    { headerName: 'Total Offer Quantity', field: 'totalOfferQty', valueFormatter: quantity, minWidth: 180 },
    { headerName: 'Ratio Offer/Bid', field: 'ratioOfferBid', valueFormatter: price, minWidth: 150 },
    { headerName: 'Currency', field: 'currency', minWidth: 100 }
  ];
}

function directionCellClass(params: ValueFormatterParams<WatchListRow, number | string>): string {
  return getDirectionClass(params.data?.changeDirection ?? 'UNCHANGED');
}

function remarksTooltip(params: { data?: WatchListRow | null }): string {
  const status = params.data?.status?.trim();
  return status && isSuspendedStatus(status) ? normalizeStatusLabel(status) : '';
}

function suspendedRemarkRenderer(params: ICellRendererParams<WatchListRow>): string {
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

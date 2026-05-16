import { ColDef, ValueFormatterParams } from 'ag-grid-community';

import { formatCompactNumber, formatPercent, formatPrice, formatQuantity } from '../utils/formatters';
import { MarketIndexRow } from './market-indices.models';
import { directionClass } from './market-indices.mapper';

const price = (params: ValueFormatterParams<MarketIndexRow, number>) => formatPrice(params.value);
const quantity = (params: ValueFormatterParams<MarketIndexRow, number>) => formatQuantity(params.value);
const percent = (params: ValueFormatterParams<MarketIndexRow, number>) => formatPercent(params.value);
const compact = (params: ValueFormatterParams<MarketIndexRow, number>) => formatCompactNumber(params.value);

export function createMarketIndicesColumns(): ColDef<MarketIndexRow>[] {
  return [
    { headerName: 'Index', field: 'index', pinned: 'left', minWidth: 120 },
    { headerName: 'Name', field: 'name', pinned: 'left', minWidth: 200 },
    { headerName: 'Short Name', field: 'shortName', minWidth: 140 },
    { headerName: 'Market Name', field: 'marketName', minWidth: 210 },
    { headerName: 'Market Short Name', field: 'marketShortName', minWidth: 150 },
    { headerName: 'Index Current Value', field: 'indexCurrentValue', valueFormatter: price, cellClass: directionCellClass, minWidth: 160 },
    { headerName: 'Initial Open Value', field: 'initialOpenValue', valueFormatter: price, minWidth: 160 },
    { headerName: 'High Price', field: 'highPrice', valueFormatter: price, minWidth: 120 },
    { headerName: 'Low Price', field: 'lowPrice', valueFormatter: price, minWidth: 120 },
    { headerName: 'Total Volume', field: 'totalVolume', valueFormatter: quantity, minWidth: 150 },
    { headerName: 'Total Value', field: 'totalValue', valueFormatter: compact, minWidth: 150 },
    { headerName: 'Previous Closed', field: 'previousClosed', valueFormatter: price, minWidth: 150 },
    { headerName: 'Net Change', field: 'netChange', valueFormatter: price, cellClass: directionCellClass, minWidth: 130 },
    { headerName: 'Change %', field: 'changePercent', valueFormatter: percent, cellClass: directionCellClass, minWidth: 120 },
    {
      headerName: 'Change Direction',
      field: 'changeDirection',
      minWidth: 150,
      cellClass: directionCellClass,
      cellRenderer: (params: { value?: MarketIndexRow['changeDirection'] }) => {
        const direction = params.value ?? 'UNCHANGED';
        const glyph = direction === 'UP' ? '↑' : direction === 'DOWN' ? '↓' : '−';
        const label = direction === 'UP' ? 'Rising' : direction === 'DOWN' ? 'Falling' : 'Unchanged';

        return `<span title="${label}" style="display:inline-flex;align-items:center;gap:0.45rem;"><span>${glyph}</span><span>${label}</span></span>`;
      }
    }
  ];
}

function directionCellClass(params: ValueFormatterParams<MarketIndexRow>): string {
  return directionClass(params.data ?? createEmptyRow());
}

function createEmptyRow(): MarketIndexRow {
  return {
    index: '',
    name: '',
    shortName: '',
    marketName: '',
    marketShortName: '',
    indexCurrentValue: 0,
    initialOpenValue: 0,
    highPrice: 0,
    lowPrice: 0,
    totalVolume: 0,
    totalValue: 0,
    previousClosed: 0,
    netChange: 0,
    changePercent: 0,
    changeDirection: 'UNCHANGED',
    updatedAt: 0
  };
}

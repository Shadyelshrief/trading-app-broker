import { ColDef, ValueFormatterParams } from 'ag-grid-community';

import { formatPrice, formatQuantity } from '../utils/formatters';
import { directionClass, directionGlyph } from './time-sales.mapper';
import { TimeSalesRow } from './time-sales.models';

const price = (params: ValueFormatterParams<TimeSalesRow, number>) => formatPrice(params.value);
const quantity = (params: ValueFormatterParams<TimeSalesRow, number>) => formatQuantity(params.value);

export function createTimeSalesColumns(): ColDef<TimeSalesRow>[] {
  return [
    { headerName: 'Symbol ID', field: 'symbolId', pinned: 'left', minWidth: 120, cellClass: symbolCellClass },
    { headerName: 'Symbol Name', field: 'symbolName', pinned: 'left', minWidth: 220, cellClass: symbolCellClass },
    { headerName: 'Market Short Name', field: 'marketShortName', minWidth: 150 },
    { headerName: 'Market Name', field: 'marketName', minWidth: 220 },
    { headerName: 'Execution Time', field: 'executionTime', minWidth: 140 },
    { headerName: 'Trade Price', field: 'tradePrice', valueFormatter: price, minWidth: 130 },
    { headerName: 'Executed Quantity', field: 'executedQuantity', valueFormatter: quantity, minWidth: 160 },
    { headerName: 'Splits', field: 'splits', valueFormatter: quantity, minWidth: 110 },
    { headerName: 'Currency', field: 'currency', minWidth: 110 },
    {
      headerName: 'Change Direction',
      field: 'changeDirection',
      minWidth: 150,
      cellClass: directionCellClass,
      cellRenderer: (params: { value?: TimeSalesRow['changeDirection'] }) => {
        const direction = params.value ?? 'UNCHANGED';
        const glyph = directionGlyph(direction);
        const label = direction === 'UP' ? 'Rising' : direction === 'DOWN' ? 'Falling' : 'Unchanged';

        return `<span title="${label}" style="display:inline-flex;align-items:center;gap:0.45rem;"><span>${glyph}</span><span>${label}</span></span>`;
      }
    }
  ];
}

function directionCellClass(params: ValueFormatterParams<TimeSalesRow>): string {
  return directionClass(params.data?.changeDirection ?? 'UNCHANGED');
}

function symbolCellClass(params: ValueFormatterParams<TimeSalesRow>): string {
  return directionCellClass(params);
}

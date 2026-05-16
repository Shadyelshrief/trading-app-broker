import { ColDef, ValueFormatterParams } from 'ag-grid-community';

import { formatCompactNumber, formatPercent, formatPrice, formatQuantity } from '../utils/formatters';
import { getHistoricalHighlightedColumn } from './historical-top-symbols.filters';
import { directionClass, directionGlyph } from './historical-top-symbols.mapper';
import {
  HistoricalTopSymbolRow,
  HistoricalTopSymbolsViewKey
} from './historical-top-symbols.models';

const price = (params: ValueFormatterParams<HistoricalTopSymbolRow, number>) => formatPrice(params.value);
const quantity = (params: ValueFormatterParams<HistoricalTopSymbolRow, number>) => formatQuantity(params.value);
const percent = (params: ValueFormatterParams<HistoricalTopSymbolRow, number>) => formatPercent(params.value);
const compact = (params: ValueFormatterParams<HistoricalTopSymbolRow, number>) => formatCompactNumber(params.value);

export function createHistoricalTopSymbolsColumns(
  selectedView: HistoricalTopSymbolsViewKey
): ColDef<HistoricalTopSymbolRow>[] {
  const highlightedColumn = getHistoricalHighlightedColumn(selectedView);

  return [
    { headerName: 'Market Name', field: 'marketName', minWidth: 210 },
    { headerName: 'Market Short Name', field: 'marketShortName', minWidth: 150 },
    { headerName: 'Symbol Name', field: 'symbolName', pinned: 'left', minWidth: 220, cellClass: symbolCellClass },
    { headerName: 'Symbol Short Name', field: 'symbolShortName', minWidth: 160, cellClass: symbolCellClass },
    { headerName: 'ID', field: 'symbolId', pinned: 'left', minWidth: 110, cellClass: symbolCellClass },
    {
      headerName: 'Last Price',
      field: 'lastPrice',
      valueFormatter: price,
      minWidth: 130,
      cellClass: cellClassFactory('lastPrice', highlightedColumn)
    },
    {
      headerName: 'Change %',
      field: 'changePercent',
      valueFormatter: percent,
      minWidth: 120,
      cellClass: cellClassFactory('changePercent', highlightedColumn)
    },
    {
      headerName: 'Change Direction',
      field: 'changeDirection',
      minWidth: 150,
      cellClass: cellClassFactory('changeDirection', highlightedColumn),
      cellRenderer: (params: { value?: HistoricalTopSymbolRow['changeDirection'] }) => {
        const direction = params.value ?? 'UNCHANGED';
        const glyph = directionGlyph(direction);
        const label = direction === 'UP' ? 'Rising' : direction === 'DOWN' ? 'Falling' : 'Unchanged';

        return `<span title="${label}" style="display:inline-flex;align-items:center;gap:0.45rem;"><span>${glyph}</span><span>${label}</span></span>`;
      }
    },
    {
      headerName: 'Total Volume',
      field: 'totalVolume',
      valueFormatter: quantity,
      minWidth: 150,
      cellClass: cellClassFactory('totalVolume', highlightedColumn)
    },
    {
      headerName: 'Turnover',
      field: 'turnover',
      valueFormatter: compact,
      minWidth: 150,
      cellClass: cellClassFactory('turnover', highlightedColumn)
    },
    {
      headerName: 'Change',
      field: 'change',
      valueFormatter: price,
      minWidth: 120,
      cellClass: cellClassFactory('change', highlightedColumn)
    },
    { headerName: 'Currency', field: 'currency', minWidth: 110 }
  ];
}

function cellClassFactory(
  field: string,
  highlightedColumn: string
): (params: ValueFormatterParams<HistoricalTopSymbolRow>) => string {
  return (params: ValueFormatterParams<HistoricalTopSymbolRow>) => {
    const classes = [directionClass(params.data?.changeDirection ?? 'UNCHANGED')];

    if (field === highlightedColumn) {
      classes.push('market-cell--spotlight');
    }

    return classes.join(' ');
  };
}

function symbolCellClass(params: ValueFormatterParams<HistoricalTopSymbolRow>): string {
  return directionClass(params.data?.changeDirection ?? 'UNCHANGED');
}

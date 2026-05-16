import { ColDef, GridOptions } from 'ag-grid-community';

export type MarketGridActionType =
  | 'watchlist'
  | 'watchlist-wizard'
  | 'chart'
  | 'copy'
  | 'export'
  | 'fit-ideal'
  | 'fit-window'
  | 'depth-order'
  | 'depth-order-special'
  | 'depth-price'
  | 'news'
  | 'buy'
  | 'sell'
  | 'quote'
  | 'spectrum'
  | 'print'
  | 'selection-type'
  | 'time-sales';

export interface MarketGridContextAction<TRow = unknown> {
  id: MarketGridActionType | string;
  label: string;
  icon?: string;
  disabled?: boolean | ((row: TRow | null) => boolean);
}

export interface MarketGridColumnPreset {
  id: string;
  label: string;
  visibleColumnIds: string[];
}

export interface MarketGridSettings {
  autoScroll: boolean;
  bidColor: string;
  offerColor: string;
  highlightColor?: string;
  fontSize: number;
  fontFamily: string;
  theme: 'dark' | 'light';
  presetId: string;
}

export interface MarketGridConfig<TRow = unknown> {
  rowData: readonly TRow[];
  columnDefs: ColDef[];
  gridOptions?: GridOptions;
  contextMenuActions?: MarketGridContextAction<TRow>[];
}

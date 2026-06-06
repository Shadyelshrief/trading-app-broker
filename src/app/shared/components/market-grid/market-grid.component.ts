import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  HostListener,
  input,
  output,
  signal
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClickedEvent,
  CellDoubleClickedEvent,
  ColDef,
  ColumnMovedEvent,
  ColumnPinnedEvent,
  ColumnResizedEvent,
  ColumnVisibleEvent,
  GetRowIdParams,
  GridApi,
  GridOptions,
  GridReadyEvent,
  RowClickedEvent,
  SortChangedEvent,
  FilterChangedEvent,
  CellContextMenuEvent
} from 'ag-grid-community';

import { MarketGridContextAction, MarketGridSettings } from '../../models/market-grid.model';

type MarketGridRow = any;

interface MarketGridContextMenuState {
  x: number;
  y: number;
  row: MarketGridRow | null;
}

@Component({
  selector: 'app-market-grid',
  standalone: true,
  imports: [CommonModule, AgGridAngular, MatProgressBarModule, MatButtonModule, MatIconModule],
  templateUrl: './market-grid.component.html',
  styleUrl: './market-grid.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketGridComponent {
  readonly rowData = input<readonly any[]>([]);
  readonly columnDefs = input<ColDef[]>([]);
  readonly gridOptions = input<GridOptions>({});
  readonly contextMenuActions = input<MarketGridContextAction<any>[]>([]);
  readonly realtimeUpdates = input(true);
  readonly loading = input(false);
  readonly marketType = input('equities');
  readonly stateKey = input('market-grid-state');
  readonly settings = input<MarketGridSettings>({
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'default'
  });

  readonly rowClicked = output<any>();
  readonly rowDoubleClicked = output<any>();
  readonly buyOrder = output<any>();
  readonly sellOrder = output<any>();
  readonly priceQuote = output<any>();
  readonly depthRequest = output<any>();
  readonly chartRequest = output<any>();
  readonly contextAction = output<{ actionId: string; row: any | null }>();
  readonly cellClicked = output<{ row: any; field: string }>();

  protected gridApi?: GridApi<any>;
  protected readonly contextMenu = signal<MarketGridContextMenuState | null>(null);
  protected readonly gridClass = computed(() => [
    'market-grid',
    this.settings().theme === 'light' ? 'market-grid--light' : 'market-grid--dark'
  ]);
  protected readonly renderedRows = computed(() => [...this.rowData()]);
  protected readonly mergedGridOptions = computed<GridOptions<any>>(() => ({
    rowSelection: {
      mode: 'multiRow',
      enableClickSelection: true
    },
    animateRows: false,
    enableCellTextSelection: true,
    ensureDomOrder: false,
    rowBuffer: 18,
    suppressAggFuncInHeader: true,
    suppressScrollOnNewData: !this.settings().autoScroll,
    tooltipShowDelay: 250,
    defaultColDef: {
      sortable: true,
      resizable: true,
      filter: true,
      enableCellChangeFlash: this.realtimeUpdates(),
      minWidth: 110
    },
    getRowId: (params) => this.resolveRowId(params),
    ...this.gridOptions()
  }));
  protected readonly cssVariables = computed(() => ({
    '--market-grid-font-size': `${this.settings().fontSize}px`,
    '--market-grid-font-family': this.settings().fontFamily,
    '--market-grid-bid-color': this.settings().bidColor,
    '--market-grid-offer-color': this.settings().offerColor,
    '--market-grid-highlight-color': this.settings().highlightColor ?? '#f6c55b'
  }));
  protected readonly loadingMessage = signal('Loading market data...');

  constructor() {
    effect(() => {
      const api = this.gridApi;

      if (!api) {
        return;
      }

      api.setGridOption('rowData', [...this.rowData()]);
    });
  }

  protected onGridReady(event: GridReadyEvent<any>): void {
    this.gridApi = event.api;
    this.restoreState();
    event.api.setGridOption('rowData', [...this.rowData()]);
    queueMicrotask(() => {
      event.api.sizeColumnsToFit();
    });
  }

  protected onRowClicked(event: RowClickedEvent<any>): void {
    if (event.data) {
      this.rowClicked.emit(event.data);
    }
  }

  protected onCellClicked(event: CellClickedEvent<any>): void {
    if (!event.data) {
      return;
    }

    const field = typeof event.colDef.field === 'string' ? event.colDef.field : event.column.getColId();
    this.cellClicked.emit({ row: event.data, field });
  }

  protected onCellDoubleClicked(event: CellDoubleClickedEvent<any>): void {
    if (!event.data) {
      return;
    }

    const field = typeof event.colDef.field === 'string' ? event.colDef.field : '';

    if (field === 'offerPrice' || field === 'offerQty' || field === 'offerSize') {
      this.buyOrder.emit(event.data);
      return;
    }

    if (field === 'bidPrice' || field === 'bidQty' || field === 'bidSize') {
      this.sellOrder.emit(event.data);
      return;
    }

    this.priceQuote.emit(event.data);
    this.rowDoubleClicked.emit(event.data);
  }

  protected onCellContextMenu(event: CellContextMenuEvent<any>): void {
    const mouseEvent = event.event instanceof MouseEvent ? event.event : null;

    if (!mouseEvent || this.contextMenuActions().length === 0) {
      return;
    }

    mouseEvent.preventDefault();
    this.contextMenu.set({
      x: mouseEvent.clientX,
      y: mouseEvent.clientY,
      row: event.data ?? null
    });
  }

  protected persistColumnState(): void {
    if (!this.gridApi) {
      return;
    }

    const columnState = this.gridApi.getColumnState();
    const filterModel = this.gridApi.getFilterModel();
    const sortModel = this.gridApi.getColumnState().filter((column) => column.sort);

    localStorage.setItem(
      this.stateKey(),
      JSON.stringify({
        columnState,
        filterModel,
        sortModel
      })
    );
  }

  protected onColumnStateChange(
    _event:
      | ColumnMovedEvent<any>
      | ColumnPinnedEvent<any>
      | ColumnResizedEvent<any>
      | ColumnVisibleEvent<any>
      | SortChangedEvent<any>
      | FilterChangedEvent<any>
  ): void {
    this.persistColumnState();
  }

  protected exportGridData(): void {
    this.gridApi?.exportDataAsCsv({
      fileName: `${this.marketType()}-grid.csv`
    });
  }

  protected isActionDisabled(action: MarketGridContextAction<any>, row: MarketGridRow | null): boolean {
    return typeof action.disabled === 'function' ? action.disabled(row) : action.disabled === true;
  }

  protected runContextAction(action: MarketGridContextAction<any>, row: MarketGridRow | null): void {
    if (this.isActionDisabled(action, row)) {
      return;
    }

    this.contextMenu.set(null);
    this.dispatchContextAction(action.id, row);
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  protected closeContextMenu(): void {
    this.contextMenu.set(null);
  }

  private dispatchContextAction(actionId: string, row: MarketGridRow | null): void {
    this.contextAction.emit({ actionId, row });

    if (!row) {
      return;
    }

    switch (actionId) {
      case 'buy':
        this.buyOrder.emit(row);
        return;
      case 'sell':
        this.sellOrder.emit(row);
        return;
      case 'quote':
        this.priceQuote.emit(row);
        return;
      case 'depth-price':
      case 'depth-order':
      case 'depth-order-special':
        this.depthRequest.emit(row);
        return;
      case 'chart':
      case 'time-sales':
      case 'spectrum':
        this.chartRequest.emit(row);
        return;
      default:
        this.rowClicked.emit(row);
    }
  }

  private restoreState(): void {
    if (!this.gridApi) {
      return;
    }

    const rawState = localStorage.getItem(this.stateKey());

    if (!rawState) {
      return;
    }

    try {
      const parsed = JSON.parse(rawState) as {
        columnState?: ReturnType<GridApi<any>['getColumnState']>;
        filterModel?: ReturnType<GridApi<any>['getFilterModel']>;
      };

      if (parsed.columnState) {
        this.gridApi.applyColumnState({
          state: parsed.columnState,
          applyOrder: true
        });
      }

      if (parsed.filterModel) {
        this.gridApi.setFilterModel(parsed.filterModel);
      }

      if (this.gridApi.getAllDisplayedColumns().length === 0) {
        localStorage.removeItem(this.stateKey());
        this.gridApi.resetColumnState();
        this.gridApi.setFilterModel(null);
      }
    } catch {
      localStorage.removeItem(this.stateKey());
    }
  }

  private resolveRowId(params: GetRowIdParams<any>): string {
    const gridOptions = this.gridOptions() as GridOptions<any>;

    if (typeof gridOptions.getRowId === 'function') {
      return gridOptions.getRowId(params);
    }

    const candidate =
      params.data['symbolId'] ??
      params.data['symbol'] ??
      params.data['id'] ??
      params.data['key'];

    return typeof candidate === 'string' || typeof candidate === 'number'
      ? `${candidate}`
      : JSON.stringify(params.data);
  }
}

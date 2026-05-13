import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import {
  CellClassRules,
  ClientSideRowModelModule,
  ColDef,
  GetRowIdParams,
  GridApi,
  GridReadyEvent,
  Module
} from 'ag-grid-community';

import { MockMarketService } from '../../core/services/mock-market.service';
import { WatchlistMarketEvent, WatchlistQuote } from '../../shared/models/watchlist-quote.model';

interface PanelState {
  title: string;
  description?: string;
}

@Component({
  selector: 'app-watchlist-panel',
  standalone: true,
  imports: [AgGridAngular, DecimalPipe],
  templateUrl: './watchlist-panel.component.html',
  styleUrl: './watchlist-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WatchlistPanelComponent {
  private readonly marketService = inject(MockMarketService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = input<PanelState>();
  protected readonly modules: Module[] = [ClientSideRowModelModule];
  protected readonly rowClassRules: CellClassRules<WatchlistQuote> = {
    'watchlist-cell--up': (params) => params.data?.direction === 'up',
    'watchlist-cell--down': (params) => params.data?.direction === 'down'
  };
  protected readonly defaultColDef: ColDef<WatchlistQuote> = {
    sortable: true,
    resizable: true,
    flex: 1,
    minWidth: 110,
    suppressMovable: true
  };
  protected readonly columnDefs: ColDef<WatchlistQuote>[] = [
    {
      headerName: 'Symbol',
      field: 'symbol',
      minWidth: 108,
      maxWidth: 130,
      cellClass: 'watchlist-cell--symbol'
    },
    {
      headerName: 'Last Price',
      field: 'lastPrice',
      cellClassRules: this.rowClassRules,
      valueFormatter: ({ value }) => this.formatPrice(value)
    },
    {
      headerName: 'Change',
      field: 'change',
      cellClassRules: this.rowClassRules,
      valueFormatter: ({ value }) => this.formatSignedNumber(value)
    },
    {
      headerName: 'Change %',
      field: 'changePercent',
      cellClassRules: this.rowClassRules,
      valueFormatter: ({ value }) => `${this.formatSignedNumber(value)}%`
    },
    {
      headerName: 'Volume',
      field: 'volume',
      minWidth: 132,
      valueFormatter: ({ value }) => this.formatVolume(value)
    }
  ];

  private gridApi?: GridApi<WatchlistQuote>;
  private subscribed = false;

  captureState(): PanelState | undefined {
    return this.state();
  }

  protected onGridReady(event: GridReadyEvent<WatchlistQuote>): void {
    this.gridApi = event.api;

    if (this.subscribed) {
      return;
    }

    this.subscribed = true;

    this.marketService
      .watchlist$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((marketEvent) => this.applyMarketEvent(marketEvent));
  }

  protected getRowId(params: GetRowIdParams<WatchlistQuote>): string {
    return params.data.symbol;
  }

  private applyMarketEvent(marketEvent: WatchlistMarketEvent): void {
    if (!this.gridApi) {
      return;
    }

    if (marketEvent.type === 'snapshot') {
      this.gridApi.applyTransactionAsync({ add: marketEvent.rows });
      return;
    }

    this.gridApi.applyTransactionAsync({ update: marketEvent.rows });
  }

  private formatPrice(value: number | null | undefined): string {
    return typeof value === 'number' ? value.toFixed(2) : '--';
  }

  private formatSignedNumber(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '--';
    }

    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}`;
  }

  private formatVolume(value: number | null | undefined): string {
    if (typeof value !== 'number') {
      return '--';
    }

    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }

    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }

    return `${value}`;
  }
}

import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AgGridAngular } from 'ag-grid-angular';
import { ClientSideRowModelModule, ColDef, Module } from 'ag-grid-community';

import { MockMarketDepthService } from '../../core/services/mock-market-depth.service';
import { MarketDepthRow } from '../../shared/models/market-depth-row.model';

interface PanelState {
  title: string;
  description?: string;
}

@Component({
  selector: 'app-market-depth-panel',
  standalone: true,
  imports: [AgGridAngular],
  templateUrl: './market-depth-panel.component.html',
  styleUrl: './market-depth-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketDepthPanelComponent {
  private readonly marketDepthService = inject(MockMarketDepthService);
  private readonly destroyRef = inject(DestroyRef);

  readonly state = input<PanelState>();
  protected readonly modules: Module[] = [ClientSideRowModelModule];
  protected readonly rowData = signal<MarketDepthRow[]>([]);
  protected readonly spread = computed(() => {
    const [topLevel] = this.rowData();

    if (!topLevel) {
      return '--';
    }

    return (topLevel.askPrice - topLevel.bidPrice).toFixed(2);
  });
  protected readonly defaultColDef: ColDef<MarketDepthRow> = {
    resizable: true,
    sortable: false,
    flex: 1,
    minWidth: 96,
    suppressMovable: true
  };
  protected readonly columnDefs: ColDef<MarketDepthRow>[] = [
    {
      headerName: 'Bid Qty',
      field: 'bidQty',
      cellClass: 'depth-cell depth-cell--bid',
      valueFormatter: ({ value }) => this.formatQty(value)
    },
    {
      headerName: 'Bid Price',
      field: 'bidPrice',
      cellClass: 'depth-cell depth-cell--bid',
      valueFormatter: ({ value }) => this.formatPrice(value)
    },
    {
      headerName: 'Ask Price',
      field: 'askPrice',
      cellClass: 'depth-cell depth-cell--ask',
      valueFormatter: ({ value }) => this.formatPrice(value)
    },
    {
      headerName: 'Ask Qty',
      field: 'askQty',
      cellClass: 'depth-cell depth-cell--ask',
      valueFormatter: ({ value }) => this.formatQty(value)
    }
  ];

  constructor() {
    this.marketDepthService
      .depth$()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((rows) => this.rowData.set(rows));
  }

  captureState(): PanelState | undefined {
    return this.state();
  }

  private formatPrice(value: number | null | undefined): string {
    return typeof value === 'number' ? value.toFixed(2) : '--';
  }

  private formatQty(value: number | null | undefined): string {
    return typeof value === 'number' ? value.toLocaleString('en-US') : '--';
  }
}

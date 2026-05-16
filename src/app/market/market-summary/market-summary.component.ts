import { AsyncPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { ColDef, GridOptions } from 'ag-grid-community';

import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketChartSeries } from '../../shared/models/market-chart.model';
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { MarketSummaryFacade } from './market-summary.facade';
import { MarketParticipantStatistic, MarketSummaryDirection, MarketSummaryViewModel } from './market-summary.models';

@Component({
  selector: 'app-market-summary',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    DecimalPipe,
    NgClass,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTabsModule,
    MarketChartComponent,
    MarketGridComponent
  ],
  templateUrl: './market-summary.component.html',
  styleUrl: './market-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketSummaryFacade]
})
export class MarketSummaryComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string }>();

  protected readonly facade = inject(MarketSummaryFacade);
  protected readonly vm$ = this.facade.vm$;
  protected readonly filtersExpanded = signal(true);
  protected readonly selectedTabIndex = signal(0);
  protected readonly gridSettings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'market-summary-statistics'
  };
  protected readonly statisticsGridOptions: GridOptions<MarketParticipantStatistic> = {
    domLayout: 'normal',
    rowSelection: {
      mode: 'singleRow',
      enableClickSelection: false
    },
    suppressCellFocus: true,
    headerHeight: 40,
    rowHeight: 42,
    getRowId: (params) => params.data.type
  };
  protected readonly statisticsColumns: ColDef<MarketParticipantStatistic>[] = [
    {
      field: 'type',
      headerName: 'Type',
      minWidth: 180
    },
    {
      field: 'buy',
      headerName: 'Buy',
      minWidth: 140,
      valueFormatter: ({ value }) => (typeof value === 'number' ? value.toLocaleString() : '--')
    },
    {
      field: 'sell',
      headerName: 'Sell',
      minWidth: 140,
      valueFormatter: ({ value }) => (typeof value === 'number' ? value.toLocaleString() : '--')
    },
    {
      field: 'net',
      headerName: 'Net',
      minWidth: 140,
      valueFormatter: ({ value }) => (typeof value === 'number' ? value.toLocaleString() : '--'),
      cellStyle: (params) => ({
        color:
          typeof params.value !== 'number'
            ? '#69a8ff'
            : params.value > 0
              ? '#49d17d'
              : params.value < 0
                ? '#ff6b6b'
                : '#69a8ff',
        fontWeight: '700'
      })
    }
  ];

  protected readonly tabLabels = ['Summary', 'Statistics'] as const;

  protected selectMarket(marketId: string): void {
    this.facade.selectMarket(marketId);
  }

  protected toggleFilters(): void {
    this.filtersExpanded.update((current) => !current);
  }

  protected setTab(index: number): void {
    this.selectedTabIndex.set(index);
  }

  protected chartSeries(vm: MarketSummaryViewModel): MarketChartSeries[] {
    return [
      {
        id: `${vm.selectedMarket}-summary`,
        label: vm.indexName,
        points: vm.chartData.map((point) => ({
          time: point.time,
          value: point.value
        }))
      }
    ];
  }

  protected directionGlyph(direction: MarketSummaryDirection): string {
    switch (direction) {
      case 'UP':
        return '↗';
      case 'DOWN':
        return '↘';
      default:
        return '→';
    }
  }

  captureState() {
    return this.state();
  }
}

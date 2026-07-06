import { AsyncPipe, DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { ColDef, GridOptions } from 'ag-grid-community';

import { LinkedFilterGroupControlComponent, MarketDropdownComponent } from '../../shared/components';
import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketChartSeries } from '../../shared/models/market-chart.model';
import { MarketGridSettings } from '../../shared/models/market-grid.model';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState
} from '../../shared/services/linked-filter-group.service';
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
    LinkedFilterGroupControlComponent,
    MarketDropdownComponent,
    MarketChartComponent,
    MarketGridComponent
  ],
  templateUrl: './market-summary.component.html',
  styleUrl: './market-summary.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketSummaryFacade]
})
export class MarketSummaryComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(MarketSummaryFacade);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('market-summary');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly selectedTabIndex = signal(0);
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  private currentMarket = 'adx';
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

  constructor() {
    this.linkedFilters
      .observe<string>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'market')
      .pipe(takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected selectMarket(marketId: string): void {
    this.applyMarket(marketId, true);
  }

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      market: this.currentMarket
    });

    if (typeof groupState['market'] === 'string') {
      this.applyMarket(groupState['market'], false);
    }

    this.linkedFilterGroupSubject.next(groupId);
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
    const state = this.state();
    const context = { ...(state?.context ?? {}) };

    if (this.linkedFilterGroup()) {
      context['linkedFilterGroup'] = this.linkedFilterGroup();
    } else {
      delete context['linkedFilterGroup'];
    }

    return { ...(state ?? {}), context };
  }

  private applyMarket(marketId: string, publish: boolean): void {
    const next = marketId.toLowerCase();

    if (next === this.currentMarket) {
      return;
    }

    this.currentMarket = next;
    this.facade.selectMarket(next);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'market', next);
    }
  }
}

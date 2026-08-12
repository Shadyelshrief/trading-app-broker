import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { take } from 'rxjs';

import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketChartTimeframe } from '../../shared/models/market-chart.model';
import { MarketGridContextAction, MarketGridSettings } from '../../shared/models/market-grid.model';
import { IndexOption, PerformancePeriod } from '../services/market-performance.service';
import { IndicatorConfigDialogComponent } from '../technical-indicators/indicator-config-dialog.component';
import { createIndicesPerformanceColumns } from './indices-performance.columns';
import { IndicesPerformanceFacade } from './indices-performance.facade';
import { buildIndexChartSeries } from './indices-performance.mapper';
import { IndicesPerformanceViewModel } from './indices-performance.models';

@Component({
  selector: 'app-indices-performance',
  standalone: true,
  imports: [
    AsyncPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MarketChartComponent,
    MarketGridComponent,
    ReactiveFormsModule
  ],
  templateUrl: './indices-performance.component.html',
  styleUrl: './indices-performance.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [IndicesPerformanceFacade]
})
export class IndicesPerformanceComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(IndicesPerformanceFacade);
  private readonly dialog = inject(MatDialog);
  protected readonly vm$ = this.facade.vm$;
  protected readonly comparisonOptions$ = this.facade.comparisonOptions$;
  protected readonly indexQueryControl = new FormControl<string | IndexOption>('', { nonNullable: true });
  protected readonly comparisonControl = new FormControl<string | IndexOption>('', { nonNullable: true });
  protected readonly columns = createIndicesPerformanceColumns();
  protected readonly periods: readonly { label: string; value: PerformancePeriod }[] = [
    { label: '1 Day', value: '1D' },
    { label: '1 Week', value: '1W' },
    { label: '1 Month', value: '1M' },
    { label: '3 Months', value: '3M' },
    { label: '6 Months', value: '6M' },
    { label: '1 Year', value: '1Y' },
    { label: 'Custom Range', value: 'CUSTOM' }
  ];
  protected readonly gridSettings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'indices-performance'
  };
  protected readonly contextActions: MarketGridContextAction[] = [
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export to Excel' },
    { id: 'fit-ideal', label: 'Fit Columns to Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns to Fit Window' },
    { id: 'print', label: 'Print' },
    { id: 'chart', label: 'Charts' },
    { id: 'quote', label: 'Product Details' },
    { id: 'add-indicator', label: 'Add Indicator' }
  ];

  constructor() {
    this.indexQueryControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((query) =>
        this.facade.updateIndexQuery(
          typeof query === 'string' ? query : `${query.indexId} ${query.indexName}`
        )
      );

    this.comparisonControl.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((query) =>
        this.facade.updateComparisonQuery(
          typeof query === 'string' ? query : `${query.indexId} ${query.indexName}`
        )
      );
  }

  protected selectIndex(option: IndexOption): void {
    this.indexQueryControl.setValue(`${option.indexId} - ${option.indexName}`, { emitEvent: false });
    this.facade.selectIndex(option.indexId);
  }

  protected addIndicator(vm: IndicesPerformanceViewModel): void {
    const dialogRef = this.dialog.open(IndicatorConfigDialogComponent, {
      width: 'min(520px, 94vw)',
      data: { existingIndicators: vm.indicators }
    });

    dialogRef.afterClosed().subscribe((indicator) => {
      if (indicator) {
        this.facade.addIndicator(indicator);
      }
    });
  }

  protected addComparison(): void {
    const rawValue = this.comparisonControl.value;
    const value = typeof rawValue === 'string' ? rawValue.trim() : rawValue.indexId;

    if (value) {
      this.facade.addComparison(value.split(' ')[0]);
      this.comparisonControl.setValue('');
    }
  }

  protected selectComparison(option: IndexOption): void {
    this.facade.addComparison(option.indexId);
    this.comparisonControl.setValue('');
  }

  protected chartSeries(vm: IndicesPerformanceViewModel) {
    return buildIndexChartSeries(
      vm.selectedIndex?.indexName ?? 'Index',
      vm.chartData,
      vm.indicatorSeries ?? [],
      vm.comparisonSeries,
      vm.showVolume
    );
  }

  protected handleContextAction(event: { actionId: string }): void {
    if (event.actionId !== 'add-indicator') {
      return;
    }

    this.vm$.pipe(take(1)).subscribe((vm) => this.addIndicator(vm));
  }

  protected chartTimeframe(period: PerformancePeriod): MarketChartTimeframe {
    switch (period) {
      case '1D':
      case '1W':
      case '1M':
      case '3M':
      case '1Y':
        return period;
      default:
        return '1M';
    }
  }

  protected exportChart(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  captureState() {
    return this.state();
  }
}

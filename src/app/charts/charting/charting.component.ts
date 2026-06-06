import { AsyncPipe, CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { MarketChartComponent } from '../../shared/components/market-chart/market-chart.component';
import type { MarketChartIndicator, MarketChartTimeframe, MarketChartType } from '../../shared/models/market-chart.model';
import { ChartComparisonPanelComponent } from '../comparison/chart-comparison-panel.component';
import { DrawingOverlayComponent } from '../line-studies/drawing-overlay.component';
import type { ChartDrawing } from '../line-studies/drawing.models';
import { LineStudiesToolbarComponent } from '../line-studies/line-studies-toolbar.component';
import { IndicatorConfigDialogComponent } from '../technical-indicators/indicator-config-dialog.component';
import {
  displayChartInstrument,
  mapTimePeriodToShared,
  normalizeChartType
} from './charting.mapper';
import { ChartingFacade } from './charting.facade';
import type {
  ChartInstrument,
  ChartRenderType,
  ChartTimePeriod,
  ChartViewModel,
  DrawingTool,
  IndicatorType,
  TechnicalIndicatorConfig
} from './charting.models';

@Component({
  selector: 'app-charting',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MarketChartComponent,
    ChartComparisonPanelComponent,
    LineStudiesToolbarComponent,
    DrawingOverlayComponent
  ],
  templateUrl: './charting.component.html',
  styleUrl: './charting.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [ChartingFacade]
})
export class ChartingComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(ChartingFacade);
  private readonly dialog = inject(MatDialog);

  protected readonly vm$ = this.facade.vm$;
  protected readonly instrumentControl = new FormControl<string | ChartInstrument>('', { nonNullable: true });
  protected readonly timePeriodControl = new FormControl<ChartTimePeriod>('INTRADAY', { nonNullable: true });
  protected readonly chartTypeControl = new FormControl<ChartRenderType>('LINE', { nonNullable: true });
  protected readonly fromDateControl = new FormControl('', { nonNullable: true });
  protected readonly toDateControl = new FormControl('', { nonNullable: true });
  protected readonly drawings = signal<readonly ChartDrawing[]>([]);
  protected readonly timePeriods: ChartTimePeriod[] = ['INTRADAY', '1D', '1W', '1M', '3M', '6M', '1Y', 'CUSTOM'];
  protected readonly chartTypes: ChartRenderType[] = ['LINE', 'CANDLESTICK', 'AREA', 'BAR'];
  protected readonly displayInstrument = displayChartInstrument;

  constructor() {
    this.instrumentControl.valueChanges
      .pipe(debounceTime(150), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateInstrumentQuery(value);
        }
      });

    this.timePeriodControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((period) => this.facade.updateTimePeriod(period));

    this.chartTypeControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((chartType) => this.facade.updateChartType(chartType));

    this.fromDateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((fromDate) => this.facade.updateCustomRange(fromDate, this.toDateControl.value));

    this.toDateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((toDate) => this.facade.updateCustomRange(this.fromDateControl.value, toDate));
  }

  protected selectInstrument(instrument: ChartInstrument): void {
    this.instrumentControl.setValue(instrument, { emitEvent: false });
    this.facade.selectInstrument(instrument);
  }

  protected addIndicator(type: IndicatorType): void {
    const definition = this.facade.technicalIndicators.getDefinition(type);

    this.dialog
      .open(IndicatorConfigDialogComponent, {
        width: 'min(480px, 94vw)',
        maxWidth: '94vw',
        data: { definition }
      })
      .afterClosed()
      .subscribe((config: TechnicalIndicatorConfig | undefined) => {
        if (config) {
          this.facade.addIndicator(config);
        }
      });
  }

  protected indicatorChips(indicators: readonly TechnicalIndicatorConfig[]): MarketChartIndicator[] {
    return indicators.map((indicator) => ({
      id: indicator.id,
      label: indicator.label,
      color: indicator.color,
      removable: true
    }));
  }

  protected chartTypeFor(vm: ChartViewModel): MarketChartType {
    return normalizeChartType(vm.chartType);
  }

  protected timeframeFor(vm: ChartViewModel): MarketChartTimeframe {
    return mapTimePeriodToShared(vm.timePeriod);
  }

  protected symbolFor(vm: ChartViewModel): string {
    return vm.selectedInstrument ? `${vm.selectedInstrument.id} · ${vm.selectedInstrument.market}` : 'Charts';
  }

  protected selectDrawingTool(tool: DrawingTool): void {
    this.facade.selectDrawingTool(tool);
  }

  protected clearDrawings(): void {
    this.drawings.set([]);
  }

  protected updateDrawings(drawings: readonly ChartDrawing[]): void {
    this.drawings.set(drawings);
  }

  protected exportChartData(vm: ChartViewModel): void {
    const rows = vm.chartData.map((point) =>
      [point.time, point.open, point.high, point.low, point.close, point.volume ?? ''].join(',')
    );
    const csv = ['time,open,high,low,close,volume', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${vm.selectedInstrument?.id ?? 'chart'}-${vm.timePeriod}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  captureState() {
    return this.state();
  }
}

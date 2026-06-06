import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';

import { displayChartInstrument } from '../charting/charting.mapper';
import type { ChartInstrument, ComparisonSeries } from '../charting/charting.models';

@Component({
  selector: 'app-chart-comparison-panel',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './chart-comparison-panel.component.html',
  styleUrl: './chart-comparison-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartComparisonPanelComponent {
  readonly enabled = input(false);
  readonly instrumentOptions = input<readonly ChartInstrument[]>([]);
  readonly comparisonSeries = input<readonly ComparisonSeries[]>([]);

  readonly queryChanged = output<string>();
  readonly addComparison = output<ChartInstrument>();
  readonly removeComparison = output<ChartInstrument>();

  protected readonly control = new FormControl<string | ChartInstrument>('', { nonNullable: true });
  protected readonly displayInstrument = displayChartInstrument;

  constructor() {
    this.control.valueChanges.pipe(debounceTime(140)).subscribe((value) => {
      if (typeof value === 'string') {
        this.queryChanged.emit(value);
      }
    });
  }

  protected selectInstrument(instrument: ChartInstrument): void {
    this.control.setValue('', { emitEvent: false });
    this.addComparison.emit(instrument);
  }
}

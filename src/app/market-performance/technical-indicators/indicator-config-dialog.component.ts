import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import {
  IndicatorDefinition,
  IndicatorDialogData,
  TechnicalIndicatorConfig,
  TechnicalIndicatorType
} from './indicator.models';

const INDICATOR_DEFINITIONS: readonly IndicatorDefinition[] = [
  { type: 'SMA', label: 'Simple Moving Average', panel: 'MAIN', color: '#18dcc1', params: [{ key: 'period', label: 'Period', type: 'number', defaultValue: 14, min: 1 }] },
  { type: 'EMA', label: 'Exponential Moving Average', panel: 'MAIN', color: '#60a5fa', params: [{ key: 'period', label: 'Period', type: 'number', defaultValue: 14, min: 1 }] },
  { type: 'RSI', label: 'Relative Strength Index', panel: 'SEPARATE', color: '#f6c55b', params: [{ key: 'period', label: 'Period', type: 'number', defaultValue: 14, min: 1 }, { key: 'source', label: 'Source', type: 'select', defaultValue: 'close', options: ['close'] }] },
  { type: 'MACD', label: 'MACD', panel: 'SEPARATE', color: '#a78bfa', params: [{ key: 'fastPeriod', label: 'Fast Period', type: 'number', defaultValue: 12, min: 1 }, { key: 'slowPeriod', label: 'Slow Period', type: 'number', defaultValue: 26, min: 1 }, { key: 'signalPeriod', label: 'Signal Period', type: 'number', defaultValue: 9, min: 1 }] },
  { type: 'BOLLINGER_BANDS', label: 'Bollinger Bands', panel: 'MAIN', color: '#34d399', params: [{ key: 'period', label: 'Period', type: 'number', defaultValue: 20, min: 1 }, { key: 'standardDeviation', label: 'Standard Deviation', type: 'number', defaultValue: 2, min: 1 }] },
  { type: 'VOLUME', label: 'Volume', panel: 'SEPARATE', color: '#64748b', params: [] },
  { type: 'ROC', label: 'Price Rate of Change', panel: 'SEPARATE', color: '#fb7185', params: [{ key: 'period', label: 'Period', type: 'number', defaultValue: 12, min: 1 }] },
  { type: 'MOMENTUM', label: 'Momentum', panel: 'SEPARATE', color: '#f97316', params: [{ key: 'period', label: 'Period', type: 'number', defaultValue: 10, min: 1 }] }
];

@Component({
  selector: 'app-indicator-config-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  templateUrl: './indicator-config-dialog.component.html',
  styleUrl: './indicator-config-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorConfigDialogComponent {
  private readonly data = inject<IndicatorDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<IndicatorConfigDialogComponent, TechnicalIndicatorConfig>>(MatDialogRef);

  protected readonly definitions = INDICATOR_DEFINITIONS;
  protected readonly typeControl = new FormControl<TechnicalIndicatorType>('SMA', { nonNullable: true });
  protected readonly params = signal<Record<string, number | string>>(this.defaultParams(this.definitions[0]));
  protected readonly selectedDefinition = computed(
    () => this.definitions.find((definition) => definition.type === this.typeControl.value) ?? this.definitions[0]
  );

  protected selectType(type: TechnicalIndicatorType): void {
    this.typeControl.setValue(type);
    this.params.set(this.defaultParams(this.selectedDefinition()));
  }

  protected updateParam(key: string, value: string): void {
    this.params.update((params) => ({
      ...params,
      [key]: value === '' || Number.isNaN(Number(value)) ? value : Number(value)
    }));
  }

  protected save(): void {
    const definition = this.selectedDefinition();
    const sequence = this.data.existingIndicators.filter((indicator) => indicator.type === definition.type).length + 1;
    const suffix = sequence > 1 ? ` ${sequence}` : '';

    this.dialogRef.close({
      id: `${definition.type.toLowerCase()}-${Date.now()}`,
      type: definition.type,
      label: `${definition.label}${suffix}`,
      params: this.params(),
      color: definition.color,
      panel: definition.panel
    });
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  private defaultParams(definition: IndicatorDefinition): Record<string, number | string> {
    return definition.params.reduce<Record<string, number | string>>((params, param) => {
      params[param.key] = param.defaultValue;
      return params;
    }, {});
  }
}

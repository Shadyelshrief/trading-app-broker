import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import type { IndicatorConfigDialogData, TechnicalIndicatorConfig } from './indicator.models';

@Component({
  selector: 'app-indicator-config-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  templateUrl: './indicator-config-dialog.component.html',
  styleUrl: './indicator-config-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class IndicatorConfigDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<IndicatorConfigDialogComponent, TechnicalIndicatorConfig>>(MatDialogRef);
  private readonly fb = inject(FormBuilder);
  protected readonly data = inject<IndicatorConfigDialogData>(MAT_DIALOG_DATA);

  protected readonly form = this.fb.nonNullable.group(
    this.data.definition.fields.reduce<Record<string, number | string>>((controls, field) => {
      controls[field.key] =
        this.data.config?.params[field.key] ??
        this.data.definition.defaultParams[field.key] ??
        (field.type === 'number' ? 0 : '');
      return controls;
    }, {})
  );

  protected submit(): void {
    const params = this.form.getRawValue();
    const definition = this.data.definition;

    this.dialogRef.close({
      id: this.data.config?.id ?? `${definition.type.toLowerCase()}-${Date.now()}`,
      type: definition.type,
      label: definition.label,
      params,
      panel: definition.panel,
      color: this.data.config?.color ?? definition.color
    });
  }
}

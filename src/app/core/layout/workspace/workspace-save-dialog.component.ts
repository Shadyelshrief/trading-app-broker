import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';

import { TradingIconComponent } from '../trading-icon/trading-icon.component';

export interface WorkspaceSaveDialogData {
  defaultName: string;
}

@Component({
  selector: 'app-workspace-save-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, TradingIconComponent],
  templateUrl: './workspace-save-dialog.component.html',
  styleUrl: './workspace-save-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class WorkspaceSaveDialogComponent {
  private readonly dialogRef = inject<MatDialogRef<WorkspaceSaveDialogComponent, string | undefined>>(
    MatDialogRef
  );
  private readonly data = inject<WorkspaceSaveDialogData>(MAT_DIALOG_DATA);

  protected readonly name = signal(this.data.defaultName);
  protected readonly submitted = signal(false);
  protected readonly valid = computed(() => this.name().trim().length > 0);

  protected updateName(value: string): void {
    this.name.set(value.slice(0, 80));
  }

  protected cancel(): void {
    this.dialogRef.close();
  }

  protected save(): void {
    this.submitted.set(true);
    const name = this.name().trim();

    if (name) {
      this.dialogRef.close(name);
    }
  }
}

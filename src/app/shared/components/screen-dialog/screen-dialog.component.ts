import { NgComponentOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Type } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface ScreenDialogData {
  /** Header title shown above the hosted screen. */
  title: string;
  /** The screen component to render (resolved from the workspace panel registry). */
  component: Type<unknown>;
  /** Panel state forwarded to the hosted component's `state` input. */
  state: unknown;
}

/**
 * Generic modal host that renders any workspace screen component inside a dialog.
 * Mirrors the workspace's virtual panel binding but for a MatDialog surface, so
 * context-menu actions can open a screen as a modal instead of a docked panel.
 */
@Component({
  selector: 'app-screen-dialog',
  standalone: true,
  imports: [NgComponentOutlet, MatButtonModule, MatDialogModule],
  template: `
    <section class="screen-dialog">
      <header class="screen-dialog__header">
        <span class="screen-dialog__title">{{ data.title }}</span>
        <button mat-stroked-button type="button" mat-dialog-close>Close</button>
      </header>

      <div class="screen-dialog__content">
        <ng-container *ngComponentOutlet="data.component; inputs: outletInputs" />
      </div>
    </section>
  `,
  styleUrl: './screen-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ScreenDialogComponent {
  protected readonly data = inject<ScreenDialogData>(MAT_DIALOG_DATA);
  protected readonly outletInputs = { state: this.data.state };
}

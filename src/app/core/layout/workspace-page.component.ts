import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspaceComponent } from './workspace.component';

/**
 * Routed workspace host — preserves Golden Layout inside the enterprise shell outlet.
 */
@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [WorkspaceComponent],
  template: '<app-workspace />',
  styleUrl: './workspace-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacePageComponent {}

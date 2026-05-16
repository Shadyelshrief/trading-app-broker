import { ChangeDetectionStrategy, Component } from '@angular/core';

import { WorkspaceComponent } from './workspace.component';

@Component({
  selector: 'app-workspace-page',
  standalone: true,
  imports: [WorkspaceComponent],
  template: '<app-workspace />',
  styleUrl: './workspace-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspacePageComponent {}

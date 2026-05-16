import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { EmptyShellPageComponent } from '../empty-shell-page.component';

@Component({
  selector: 'app-dashboard-widget',
  standalone: true,
  imports: [EmptyShellPageComponent],
  template: '<app-empty-shell-page />',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardWidgetComponent {
  readonly state = input<{ title: string; route: string }>();

  captureState() {
    return this.state();
  }
}

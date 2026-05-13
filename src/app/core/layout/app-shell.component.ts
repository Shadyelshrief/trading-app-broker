import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ShellLayoutService } from './shell-layout.service';
import { TradingHeaderComponent } from './trading-header/trading-header.component';
import { TradingSidebarComponent } from './trading-sidebar/trading-sidebar.component';
import { WorkspaceComponent } from './workspace.component';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    TradingHeaderComponent,
    TradingSidebarComponent,
    WorkspaceComponent
  ],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent {
  protected readonly layout = inject(ShellLayoutService);

  protected readonly isSubWindow =
    typeof window !== 'undefined' &&
    new URL(window.location.href).searchParams.has('gl-window');
}

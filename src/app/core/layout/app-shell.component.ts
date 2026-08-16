import { ChangeDetectionStrategy, Component, OnDestroy, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MarketDataService } from '../market-data';
import { ShellLayoutService } from './shell-layout.service';
import { TopNavigationComponent } from './top-navigation/top-navigation.component';
import { TradingHeaderComponent } from './trading-header/trading-header.component';
import { isWorkspacePopoutUrl } from './workspace/workspace-popout.util';
import { WorkspaceLayoutService } from './workspace/workspace-layout.service';
import { WorkspaceSessionService } from './workspace/workspace-session.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, TradingHeaderComponent, TopNavigationComponent],
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppShellComponent implements OnDestroy {
  private readonly marketData = inject(MarketDataService);
  private readonly workspaceSession = inject(WorkspaceSessionService);
  private readonly workspaceLayout = inject(WorkspaceLayoutService);
  private readonly shellLayout = inject(ShellLayoutService);
  private readonly unregisterCleanup: Array<() => void> = [];
  protected readonly isPopout = typeof window !== 'undefined' && isWorkspacePopoutUrl(window.location.href);

  constructor() {
    void this.shellLayout.theme();
    this.marketData.connect();
    this.unregisterCleanup.push(
      this.workspaceSession.registerCleanup(() => this.marketData.disconnect()),
      this.workspaceSession.registerCleanup(() => this.workspaceLayout.closeAllPopouts())
    );
  }

  ngOnDestroy(): void {
    for (const unregister of this.unregisterCleanup) {
      unregister();
    }
  }
}

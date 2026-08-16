import { ChangeDetectionStrategy, Component, HostListener, inject, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { AuthService } from '../../auth/auth.service';
import { ShellLayoutService } from '../shell-layout.service';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';
import { WorkspaceLayoutService } from '../workspace/workspace-layout.service';
import { HeaderCommandSearchComponent } from './header-command-search.component';
import { HeaderMarketStatusComponent } from './header-market-status.component';

@Component({
  selector: 'app-trading-header',
  standalone: true,
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    TradingIconComponent,
    HeaderCommandSearchComponent,
    HeaderMarketStatusComponent
  ],
  templateUrl: './trading-header.component.html',
  styleUrl: './trading-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingHeaderComponent {
  protected readonly layout = inject(ShellLayoutService);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly profileOpen = signal(false);

  private readonly auth = inject(AuthService);

  protected toggleProfile(): void {
    this.profileOpen.update((open) => !open);
  }

  protected signOut(): void {
    this.profileOpen.set(false);
    this.auth.logout();
  }

  protected toggleTheme(): void {
    this.layout.toggleTheme();
  }

  protected selectWorkspace(value: string): void {
    if (value.startsWith('workspace:')) {
      this.workspace.restoreWorkspace(value.replace('workspace:', ''));
    }
  }

  protected saveWorkspace(): void {
    this.workspace.saveCurrentWorkspace();
  }

  protected resetWorkspace(): void {
    this.workspace.resetLayout();
  }

  protected selectedWorkspaceValue(): string | null {
    const workspaceId = this.workspace.selectedWorkspaceId();
    return workspaceId ? `workspace:${workspaceId}` : null;
  }

  protected trackWorkspace(item: { id?: string; name?: string }): string {
    return item.id || item.name || 'workspace';
  }

  protected workspaceOptionValue(item: { id?: string; name?: string }): string | null {
    const key = item.id || item.name;
    return key ? `workspace:${key}` : null;
  }

  protected deleteSelectedWorkspace(event: MouseEvent): void {
    event.stopPropagation();
    this.workspace.deleteWorkspace();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.trading-header__profile')) {
      this.profileOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.profileOpen.set(false);
  }
}

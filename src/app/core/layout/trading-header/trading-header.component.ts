import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { HeaderMarketStatusComponent } from './header-market-status.component';
import { ShellLayoutService } from '../shell-layout.service';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';
import { WorkspaceLayoutService } from '../workspace/workspace-layout.service';

@Component({
  selector: 'app-trading-header',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TradingIconComponent,
    HeaderMarketStatusComponent
  ],
  templateUrl: './trading-header.component.html',
  styleUrl: './trading-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingHeaderComponent {
  private readonly auth = inject(AuthService);
  protected readonly layout = inject(ShellLayoutService);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly routePath = signal(this.router.url);
  protected readonly profileOpen = signal(false);
  protected readonly commandSearch = signal('');

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.routePath.set(this.router.url));
  }

  protected toggleProfile(): void {
    this.profileOpen.update((v) => !v);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
  }

  protected signOut(): void {
    this.closeProfile();
    this.auth.logout();
  }

  protected toggleTheme(): void {
    this.layout.toggleTheme();
  }

  protected toggleMobileNav(): void {
    this.layout.toggleMobileNav();
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
    this.layout.closeMobileNav();
    this.profileOpen.set(false);
  }
}

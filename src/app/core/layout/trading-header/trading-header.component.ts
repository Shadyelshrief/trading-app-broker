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
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { AuthService } from '../../auth/auth.service';
import { ShellLayoutService } from '../shell-layout.service';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';

@Component({
  selector: 'app-trading-header',
  standalone: true,
  imports: [TradingIconComponent],
  templateUrl: './trading-header.component.html',
  styleUrl: './trading-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingHeaderComponent {
  private readonly auth = inject(AuthService);
  protected readonly layout = inject(ShellLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  protected readonly now = signal(new Date());
  protected readonly routePath = signal(this.router.url);
  protected readonly profileOpen = signal(false);

  private clockIntervalId?: number;

  protected readonly workspaces = [
    { id: 'default', label: 'Default workspace' },
    { id: 'scalper', label: 'Scalper layout' },
    { id: 'research', label: 'Research layout' }
  ];

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.routePath.set(this.router.url));

    const win = this.document.defaultView;

    if (!win) {
      return;
    }

    this.clockIntervalId = win.setInterval(() => {
      this.now.set(new Date());
    }, 1000);

    this.destroyRef.onDestroy(() => {
      if (this.clockIntervalId !== undefined) {
        win.clearInterval(this.clockIntervalId);
      }
    });
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

  protected onWorkspaceSelect(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.layout.setWorkspaceId(select.value);
  }

  protected formatClock(d: Date): string {
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  protected formatSession(d: Date): string {
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
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

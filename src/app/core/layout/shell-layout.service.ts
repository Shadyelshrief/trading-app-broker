import { Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

const STORAGE_SIDEBAR = 'broker_shell_sidebar_collapsed';
const STORAGE_THEME = 'broker_shell_theme';
const STORAGE_WORKSPACE = 'broker_shell_workspace_id';

export type ShellTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ShellLayoutService {
  private readonly document = inject(DOCUMENT);

  /** Desktop / tablet: narrow rail vs full labels. */
  readonly sidebarCollapsed = signal(false);

  /** Mobile overlay drawer. */
  readonly mobileNavOpen = signal(false);

  readonly theme = signal<ShellTheme>('dark');

  /** Workspace profile label (persisted). */
  readonly activeWorkspaceId = signal<string>('default');

  constructor() {
    this.hydrateFromStorage();

    effect(() => {
      const collapsed = this.sidebarCollapsed();

      if (this.document.defaultView) {
        this.document.defaultView.localStorage.setItem(STORAGE_SIDEBAR, collapsed ? '1' : '0');
      }
    });

    effect(() => {
      const theme = this.theme();
      this.document.documentElement.setAttribute('data-theme', theme);

      if (this.document.defaultView) {
        this.document.defaultView.localStorage.setItem(STORAGE_THEME, theme);
      }
    });

    effect(() => {
      const id = this.activeWorkspaceId();

      if (this.document.defaultView) {
        this.document.defaultView.localStorage.setItem(STORAGE_WORKSPACE, id);
      }
    });
  }

  toggleSidebarCollapsed(): void {
    this.sidebarCollapsed.update((v) => !v);
  }

  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed.set(collapsed);
  }

  toggleMobileNav(): void {
    this.mobileNavOpen.update((v) => !v);
  }

  closeMobileNav(): void {
    this.mobileNavOpen.set(false);
  }

  toggleTheme(): void {
    this.theme.update((t) => (t === 'dark' ? 'light' : 'dark'));
  }

  setWorkspaceId(id: string): void {
    this.activeWorkspaceId.set(id);
  }

  private hydrateFromStorage(): void {
    const win = this.document.defaultView;

    if (!win) {
      return;
    }

    this.sidebarCollapsed.set(win.localStorage.getItem(STORAGE_SIDEBAR) === '1');

    const storedTheme = win.localStorage.getItem(STORAGE_THEME);

    if (storedTheme === 'light' || storedTheme === 'dark') {
      this.theme.set(storedTheme);
    }

    const ws = win.localStorage.getItem(STORAGE_WORKSPACE);

    if (ws) {
      this.activeWorkspaceId.set(ws);
    }
  }
}

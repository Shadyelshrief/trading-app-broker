import { Injectable, effect, inject, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';

import { CrossWindowWorkspaceService } from './workspace/cross-window-workspace.service';

const STORAGE_THEME = 'broker_shell_theme';
const STORAGE_WORKSPACE = 'broker_shell_workspace_id';

export type ShellTheme = 'dark' | 'light';

@Injectable({ providedIn: 'root' })
export class ShellLayoutService {
  private readonly document = inject(DOCUMENT);
  private readonly crossWindow = inject(CrossWindowWorkspaceService);

  readonly theme = signal<ShellTheme>('dark');

  /** Workspace profile label (persisted). */
  readonly activeWorkspaceId = signal<string>('default');

  constructor() {
    this.hydrateFromStorage();
    this.crossWindow.observe<ShellTheme>('THEME_CHANGED').subscribe((message) => {
      if (message.payload === 'dark' || message.payload === 'light') {
        this.setTheme(message.payload, false);
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

  toggleTheme(): void {
    this.setTheme(this.theme() === 'dark' ? 'light' : 'dark');
  }

  setTheme(theme: ShellTheme, broadcast = true): void {
    this.theme.set(theme);
    if (broadcast) {
      this.crossWindow.publish('THEME_CHANGED', theme);
    }
  }

  setWorkspaceId(id: string): void {
    this.activeWorkspaceId.set(id);
  }

  private hydrateFromStorage(): void {
    const win = this.document.defaultView;

    if (!win) {
      return;
    }

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

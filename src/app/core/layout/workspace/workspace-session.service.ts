import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';

import { CrossWindowWorkspaceService } from './cross-window-workspace.service';
import { WorkspacePopoutService } from './workspace-popout.service';

export type WorkspaceSessionEndReason = 'LOGOUT' | 'SESSION_EXPIRED';

@Injectable({ providedIn: 'root' })
export class WorkspaceSessionService implements OnDestroy {
  private readonly crossWindow = inject(CrossWindowWorkspaceService);
  private readonly popouts = inject(WorkspacePopoutService);
  private readonly subscriptions = new Subscription();
  private readonly cleanupCallbacks = new Set<() => void>();
  private sessionTerminator?: (reason: WorkspaceSessionEndReason) => void;

  constructor() {
    this.subscriptions.add(this.crossWindow.observe('LOGOUT').subscribe(() => this.handleRemoteEnd('LOGOUT')));
    this.subscriptions.add(
      this.crossWindow.observe('SESSION_EXPIRED').subscribe(() => this.handleRemoteEnd('SESSION_EXPIRED'))
    );
  }

  registerCleanup(callback: () => void): () => void {
    this.cleanupCallbacks.add(callback);
    return () => this.cleanupCallbacks.delete(callback);
  }

  registerSessionTerminator(callback: (reason: WorkspaceSessionEndReason) => void): void {
    this.sessionTerminator = callback;
  }

  endSession(reason: WorkspaceSessionEndReason): void {
    this.crossWindow.publish(reason);
    this.runCleanup();
    this.popouts.closeAll();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.cleanupCallbacks.clear();
  }

  private handleRemoteEnd(reason: WorkspaceSessionEndReason): void {
    this.runCleanup();
    this.popouts.closeAll();
    this.sessionTerminator?.(reason);

    if (this.crossWindow.windowId !== 'MAIN' && typeof window !== 'undefined') {
      try {
        window.close();
      } catch {
        // A browser may reject closing a window it no longer considers script-owned.
      } finally {
        if (!window.closed) {
          window.location.assign('/login');
        }
      }
    }
  }

  private runCleanup(): void {
    for (const callback of this.cleanupCallbacks) {
      callback();
    }
  }
}

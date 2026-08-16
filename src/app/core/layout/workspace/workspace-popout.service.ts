import { Injectable, signal } from '@angular/core';
import type { BrowserPopout } from 'golden-layout';

import { clampWorkspacePopoutGeometry } from './workspace-popout.util';
import { SavedWorkspacePopout, WorkspacePopoutRuntimeSnapshot } from './workspace.models';

export interface WorkspacePopoutHandle {
  toConfig(): unknown;
  getWindow(): Window;
  close(): void;
}

export type WorkspacePopoutOpener = (popout: SavedWorkspacePopout) => WorkspacePopoutHandle;

@Injectable({ providedIn: 'root' })
export class WorkspacePopoutService {
  private readonly handles = new Map<string, WorkspacePopoutHandle>();
  private readonly idsByHandle = new Map<WorkspacePopoutHandle, string>();
  private readonly restoredHandles = new WeakSet<WorkspacePopoutHandle>();
  private idSeed = 0;

  readonly activeCount = signal(0);

  register(handle: BrowserPopout | WorkspacePopoutHandle, preferredId?: string): string {
    const knownId = this.idsByHandle.get(handle);
    if (knownId) {
      return knownId;
    }

    const id = preferredId ?? this.nextId();
    this.handles.set(id, handle);
    this.idsByHandle.set(handle, id);
    if (preferredId) {
      this.restoredHandles.add(handle);
    }
    this.activeCount.set(this.handles.size);
    return id;
  }

  unregister(handle: BrowserPopout | WorkspacePopoutHandle): void {
    const id = this.idsByHandle.get(handle);
    if (!id) {
      return;
    }

    this.idsByHandle.delete(handle);
    this.handles.delete(id);
    this.activeCount.set(this.handles.size);
  }

  isRegistered(handle: BrowserPopout | WorkspacePopoutHandle): boolean {
    return this.idsByHandle.has(handle);
  }

  isRestored(handle: BrowserPopout | WorkspacePopoutHandle): boolean {
    return this.restoredHandles.has(handle);
  }

  open(popout: SavedWorkspacePopout, opener: WorkspacePopoutOpener): 'opened' | 'focused' | 'blocked' {
    const existing = this.handles.get(popout.id);

    if (existing && isOpen(existing)) {
      try {
        existing.getWindow().focus();
      } catch {
        // A still-open child may deny focus; it is nevertheless not duplicated.
      }
      return 'focused';
    }

    if (existing) {
      this.unregister(existing);
    }

    try {
      const restoredPopout = {
        ...popout,
        geometry: clampWorkspacePopoutGeometry(popout.geometry, getVisibleScreens())
      };
      const handle = opener(restoredPopout);
      const childWindow = handle.getWindow();

      if (!childWindow || childWindow.closed) {
        return 'blocked';
      }

      this.register(handle, popout.id);
      applyGeometry(childWindow, restoredPopout.geometry);
      childWindow.focus();
      return 'opened';
    } catch {
      return 'blocked';
    }
  }

  capture(): WorkspacePopoutRuntimeSnapshot[] {
    const snapshots: WorkspacePopoutRuntimeSnapshot[] = [];

    for (const [id, handle] of this.handles) {
      try {
        const childWindow = handle.getWindow();

        if (childWindow.closed) {
          this.unregister(handle);
          continue;
        }

        snapshots.push({
          id,
          layout: handle.toConfig(),
          geometry: {
            left: finiteNumber(childWindow.screenX),
            top: finiteNumber(childWindow.screenY),
            width: positiveNumber(childWindow.outerWidth) ?? positiveNumber(childWindow.innerWidth) ?? 720,
            height: positiveNumber(childWindow.outerHeight) ?? positiveNumber(childWindow.innerHeight) ?? 520
          }
        });
      } catch {
        // Golden Layout cannot serialize a child until it has initialized. A
        // later save will include it; runtime objects are never persisted.
      }
    }

    return snapshots;
  }

  close(id: string): void {
    const handle = this.handles.get(id);
    if (!handle) {
      return;
    }

    try {
      handle.close();

      const childWindow = handle.getWindow();
      if (!childWindow.closed) {
        childWindow.location.assign('/login');
      }
    } catch {
      try {
        handle.getWindow().location.assign('/login');
      } catch {
        // Cross-window session handling also clears and redirects the child.
      }
    }

    this.unregister(handle);
  }

  closeAll(): void {
    for (const id of [...this.handles.keys()]) {
      this.close(id);
    }
  }

  private nextId(): string {
    this.idSeed += 1;
    return `POP-${Date.now().toString(36).toUpperCase()}-${this.idSeed}`;
  }
}

function isOpen(handle: WorkspacePopoutHandle): boolean {
  try {
    return !handle.getWindow().closed;
  } catch {
    return false;
  }
}

function applyGeometry(childWindow: Window, geometry: SavedWorkspacePopout['geometry']): void {
  try {
    if (geometry.left !== undefined && geometry.top !== undefined) {
      childWindow.moveTo(geometry.left, geometry.top);
    }
    childWindow.resizeTo(geometry.width, geometry.height);
  } catch {
    // Browser/OS window-management policy may reject exact geometry.
  }
}

function getVisibleScreens(): Array<{ left: number; top: number; width: number; height: number }> {
  if (typeof window === 'undefined') {
    return [{ left: 0, top: 0, width: 1440, height: 900 }];
  }

  const screen = window.screen as Screen & { availLeft?: number; availTop?: number; isExtended?: boolean };

  // Without Screen Details permission, preserve extended-desktop coordinates.
  // The OS/browser can place them more accurately than a single-screen clamp.
  if (screen.isExtended) {
    return [];
  }

  return [{
    left: screen.availLeft ?? 0,
    top: screen.availTop ?? 0,
    width: screen.availWidth || window.outerWidth || 1440,
    height: screen.availHeight || window.outerHeight || 900
  }];
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

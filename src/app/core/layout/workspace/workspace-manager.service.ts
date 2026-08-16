import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { WorkspacePreferences, WorkspaceThemePreference } from './workspace-preferences.service';
import { WorkspaceSerializerService } from './workspace-serializer.service';
import { WORKSPACE_STORAGE_ADAPTER } from './workspace-storage.adapter';
import {
  SavedWorkspace,
  WorkspaceGlobalState,
  WorkspacePopoutRuntimeSnapshot,
  WorkspaceRestoreResult,
  WorkspaceRestoreState
} from './workspace.models';
import { WorkspacePopoutOpener, WorkspacePopoutService } from './workspace-popout.service';

export interface SaveManagedWorkspaceInput {
  id?: string;
  name: string;
  theme: WorkspaceThemePreference;
  languageId: string;
  mainLayout: unknown;
  popouts: WorkspacePopoutRuntimeSnapshot[];
  globalState: WorkspaceGlobalState;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceManagerService {
  private readonly serializer = inject(WorkspaceSerializerService);
  private readonly popoutService = inject(WorkspacePopoutService);
  private readonly storage = inject(WORKSPACE_STORAGE_ADAPTER);
  private activeWorkspace: SavedWorkspace | null = null;

  readonly dirty = signal(false);
  readonly restoreState = signal<WorkspaceRestoreState>('IDLE');
  readonly pendingPopoutCount = signal(0);
  readonly blockedPopoutCount = signal(0);

  loadWorkspace(refresh = false): Observable<WorkspacePreferences[]> {
    return this.storage.load(refresh);
  }

  deserializePreference(preference: WorkspacePreferences): SavedWorkspace | null {
    const workspace = this.serializer.deserializeWorkspace(preference.layoutJson, {
      id: preference.id,
      name: preference.name
    });

    this.activeWorkspace = workspace;
    this.pendingPopoutCount.set(workspace?.popouts.length ?? 0);
    this.blockedPopoutCount.set(0);
    this.restoreState.set('IDLE');
    this.dirty.set(false);
    return workspace;
  }

  saveWorkspace(input: SaveManagedWorkspaceInput): Observable<WorkspacePreferences[]> {
    const serialized = this.serializer.serializeWorkspace({
      id: input.id,
      name: input.name,
      mainLayout: input.mainLayout,
      popouts: input.popouts,
      globalState: input.globalState,
      createdAt: this.activeWorkspace?.createdAt
    });

    return this.storage.save({
      id: input.id,
      name: input.name,
      theme: input.theme,
      languageId: input.languageId,
      layoutJson: serialized
    }).pipe(
      tap(() => {
        this.activeWorkspace = serialized;
        this.pendingPopoutCount.set(serialized.popouts.length);
        this.dirty.set(false);
      })
    );
  }

  restoreMainLayout(workspace: SavedWorkspace, loader: (layout: unknown) => void): void {
    loader(workspace.mainLayout);
  }

  restorePopouts(opener: WorkspacePopoutOpener): WorkspaceRestoreResult {
    const popouts = this.activeWorkspace?.popouts ?? [];

    if (this.restoreState() === 'RESTORING') {
      return { requested: popouts.length, opened: 0, blocked: this.blockedPopoutCount() };
    }

    if (popouts.length === 0) {
      this.restoreState.set('RESTORED');
      this.pendingPopoutCount.set(0);
      return { requested: 0, opened: 0, blocked: 0 };
    }

    this.restoreState.set('RESTORING');
    this.blockedPopoutCount.set(0);

    let opened = 0;
    let blocked = 0;

    for (const popout of popouts) {
      const result = this.popoutService.open(popout, opener);
      if (result === 'blocked') {
        blocked += 1;
      } else {
        opened += 1;
      }
    }

    this.blockedPopoutCount.set(blocked);
    this.restoreState.set(blocked === 0 ? 'RESTORED' : opened > 0 ? 'PARTIAL' : 'FAILED');
    this.pendingPopoutCount.set(blocked);
    return { requested: popouts.length, opened, blocked };
  }

  openPopout(popoutId: string, opener: WorkspacePopoutOpener): boolean {
    const popout = this.activeWorkspace?.popouts.find((item) => item.id === popoutId);
    return popout ? this.popoutService.open(popout, opener) !== 'blocked' : false;
  }

  closePopout(popoutId: string): void {
    this.popoutService.close(popoutId);
    this.markDirty();
  }

  resetWorkspace(): void {
    this.popoutService.closeAll();
    this.activeWorkspace = null;
    this.pendingPopoutCount.set(0);
    this.blockedPopoutCount.set(0);
    this.restoreState.set('IDLE');
    this.dirty.set(false);
  }

  continueWithMainWindow(): void {
    this.pendingPopoutCount.set(0);
  }

  markDirty(): void {
    this.dirty.set(true);
  }

  getRestoreState(): WorkspaceRestoreState {
    return this.restoreState();
  }

  activeSavedWorkspace(): SavedWorkspace | null {
    return this.activeWorkspace;
  }
}

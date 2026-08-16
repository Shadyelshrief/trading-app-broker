import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  SaveWorkspacePreferences,
  WorkspacePreferences,
  WorkspacePreferencesService
} from './workspace-preferences.service';

export abstract class WorkspaceStorageAdapter {
  abstract load(refresh?: boolean): Observable<WorkspacePreferences[]>;
  abstract save(workspace: SaveWorkspacePreferences): Observable<WorkspacePreferences[]>;
}

export const WORKSPACE_STORAGE_ADAPTER = new InjectionToken<WorkspaceStorageAdapter>('WORKSPACE_STORAGE_ADAPTER', {
  providedIn: 'root',
  factory: () => inject(PreferencesWorkspaceStorageAdapter)
});

@Injectable({ providedIn: 'root' })
export class PreferencesWorkspaceStorageAdapter extends WorkspaceStorageAdapter {
  private readonly preferences = inject(WorkspacePreferencesService);

  load(refresh = false): Observable<WorkspacePreferences[]> {
    return this.preferences.getPreferences(refresh);
  }

  save(workspace: SaveWorkspacePreferences): Observable<WorkspacePreferences[]> {
    return this.preferences.savePreferences(workspace);
  }
}

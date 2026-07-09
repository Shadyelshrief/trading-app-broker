import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';

const LOCAL_WORKSPACES_KEY = 'brokeros.workspace.preferences.v1';
const LOCAL_WORKSPACE_PREFIX = 'local:';

export type WorkspaceThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface WorkspacePreferences {
  id?: string;
  userId?: string;
  name?: string;
  isDefault?: boolean;
  theme?: WorkspaceThemePreference;
  languageId?: string;
  layoutJson?: object | null;
}

export type SaveWorkspacePreferences = Required<Pick<WorkspacePreferences, 'name' | 'theme' | 'languageId'>> &
  Pick<WorkspacePreferences, 'id' | 'layoutJson'>;

interface WorkspacePreferencesResponse {
  status?: 'SUCCESS' | 'WARN_POPUP' | 'ERROR_POPUP' | 'VALIDATION_FAIL' | 'FATAL_CRASH';
  message?: string;
  messageLocale?: string;
  body?: WorkspacePreferences | WorkspacePreferences[];
}

@Injectable({ providedIn: 'root' })
export class WorkspacePreferencesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/workspaces/my-preferences`;
  private preferences$?: Observable<WorkspacePreferences[]>;

  getPreferences(refresh = false): Observable<WorkspacePreferences[]> {
    if (refresh) {
      this.preferences$ = undefined;
    }

    this.preferences$ ??= this.http.get<WorkspacePreferencesResponse | WorkspacePreferences | WorkspacePreferences[]>(this.url).pipe(
      map((response) => mergeWorkspacePreferences(normalizeWorkspacePreferences(extractWorkspaceBody(response)), readLocalPreferences())),
      catchError(() => of(readLocalPreferences())),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.preferences$;
  }

  savePreferences(body: SaveWorkspacePreferences): Observable<WorkspacePreferences[]> {
    if (!body.id || isLocalWorkspaceId(body.id)) {
      const preferences = upsertLocalPreference(body);
      this.preferences$ = undefined;
      return of(preferences);
    }

    return this.http.put<WorkspacePreferencesResponse | WorkspacePreferences | WorkspacePreferences[]>(this.url, body).pipe(
      map((response) => mergeWorkspacePreferences(normalizeWorkspacePreferences(extractWorkspaceBody(response) ?? body), readLocalPreferences())),
      tap(() => {
        this.preferences$ = undefined;
      })
    );
  }
}

function isLocalWorkspaceId(id: string): boolean {
  return id.startsWith(LOCAL_WORKSPACE_PREFIX);
}

function upsertLocalPreference(body: SaveWorkspacePreferences): WorkspacePreferences[] {
  const preferences = readLocalPreferences();
  const id = body.id || `${LOCAL_WORKSPACE_PREFIX}${createId()}`;
  const index = preferences.findIndex(
    (preference) => preference.id === id || preference.name?.trim().toLowerCase() === body.name.trim().toLowerCase()
  );
  const next = { ...body, id, isDefault: false };

  if (index >= 0) {
    preferences[index] = next;
  } else {
    preferences.push(next);
  }

  writeLocalPreferences(preferences);
  return preferences;
}

function readLocalPreferences(): WorkspacePreferences[] {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  try {
    return normalizeWorkspacePreferences(JSON.parse(localStorage.getItem(LOCAL_WORKSPACES_KEY) || '[]'));
  } catch {
    return [];
  }
}

function writeLocalPreferences(preferences: WorkspacePreferences[]): void {
  if (typeof localStorage === 'undefined') {
    return;
  }

  localStorage.setItem(LOCAL_WORKSPACES_KEY, JSON.stringify(preferences));
}

function mergeWorkspacePreferences(remote: WorkspacePreferences[], local: WorkspacePreferences[]): WorkspacePreferences[] {
  const merged = [...remote];

  for (const preference of local) {
    if (!merged.some((item) => item.id === preference.id || item.name === preference.name)) {
      merged.push(preference);
    }
  }

  return merged;
}

function createId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function extractWorkspaceBody(
  value: WorkspacePreferencesResponse | WorkspacePreferences | WorkspacePreferences[]
): WorkspacePreferences | WorkspacePreferences[] | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'body' in value) {
    return value.body;
  }

  return value as WorkspacePreferences | WorkspacePreferences[];
}

function normalizeWorkspacePreferences(value: WorkspacePreferences | WorkspacePreferences[] | undefined): WorkspacePreferences[] {
  if (!value) {
    return [];
  }

  return (Array.isArray(value) ? value : [value])
    .filter((preference): preference is WorkspacePreferences => !!preference && typeof preference === 'object')
    .map((preference) => ({
      ...preference,
      layoutJson: parseLayoutJson(preference.layoutJson)
    }));
}

function parseLayoutJson(value: object | string | null | undefined): object | null | undefined {
  if (typeof value !== 'string') {
    return value;
  }

  try {
    return JSON.parse(value) as object;
  } catch {
    return null;
  }
}

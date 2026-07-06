import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';

import { environment } from '../../../../environments/environment';

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

export type SaveWorkspacePreferences = Required<Pick<WorkspacePreferences, 'theme' | 'languageId'>> &
  Pick<WorkspacePreferences, 'layoutJson'>;

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
      map((response) => normalizeWorkspacePreferences(extractWorkspaceBody(response))),
      catchError(() => of([])),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    return this.preferences$;
  }

  savePreferences(body: SaveWorkspacePreferences): Observable<WorkspacePreferences[]> {
    return this.http.put<WorkspacePreferencesResponse | WorkspacePreferences | WorkspacePreferences[]>(this.url, body).pipe(
      map((response) => normalizeWorkspacePreferences(extractWorkspaceBody(response) ?? body)),
      tap(() => {
        this.preferences$ = undefined;
      })
    );
  }
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

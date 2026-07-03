import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../../environments/environment';

export type WorkspaceThemePreference = 'SYSTEM' | 'LIGHT' | 'DARK';

export interface WorkspacePreferences {
  theme?: WorkspaceThemePreference;
  languageId?: string;
  layoutJson?: object | null;
}

interface WorkspacePreferencesResponse {
  status?: 'SUCCESS' | 'WARN_POPUP' | 'ERROR_POPUP' | 'VALIDATION_FAIL' | 'FATAL_CRASH';
  message?: string;
  messageLocale?: string;
  body?: WorkspacePreferences;
}

@Injectable({ providedIn: 'root' })
export class WorkspacePreferencesService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/workspaces/my-preferences`;

  getPreferences(): Observable<WorkspacePreferences> {
    return this.http.get<WorkspacePreferencesResponse>(this.url).pipe(map((response) => response.body ?? {}));
  }

  savePreferences(body: Required<Pick<WorkspacePreferences, 'theme' | 'languageId'>> & Pick<WorkspacePreferences, 'layoutJson'>): Observable<WorkspacePreferences> {
    return this.http.put<WorkspacePreferencesResponse>(this.url, body).pipe(map((response) => response.body ?? body));
  }
}

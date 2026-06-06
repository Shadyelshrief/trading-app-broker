import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  MessageResponse,
  ResetPasswordRequest
} from './auth.models';

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'broker_auth_v1_access_token';
export const AUTH_LOGIN_TIME_STORAGE_KEY = 'broker_auth_v1_login_time';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);

  private readonly accessToken = signal<string | null>(this.readStoredToken());

  readonly isAuthenticated = computed(() => {
    const token = this.accessToken();

    return typeof token === 'string' && token.length > 0;
  });

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.api.login(credentials).pipe(
      tap((response) => this.persistSession(response.accessToken)),
      catchError((error) => throwError(() => error))
    );
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.api.forgotPassword(body).pipe(catchError((error) => throwError(() => error)));
  }

  resetPassword(body: ResetPasswordRequest): Observable<MessageResponse> {
    return this.api.resetPassword(body).pipe(catchError((error) => throwError(() => error)));
  }

  logout(navigate: boolean = true): void {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
      window.localStorage.removeItem(AUTH_LOGIN_TIME_STORAGE_KEY);
    }

    this.accessToken.set(null);

    if (navigate) {
      void this.router.navigateByUrl('/login');
    }
  }

  getBearerToken(): string | null {
    return this.accessToken();
  }

  persistSession(token: string): void {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, token);
      window.localStorage.setItem(AUTH_LOGIN_TIME_STORAGE_KEY, `${Date.now()}`);
    }

    this.accessToken.set(token);
  }

  private readStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  }
}

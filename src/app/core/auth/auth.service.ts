import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { EMPTY, Observable, catchError, map, shareReplay, switchMap, tap, throwError } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ApiResponseWrapper,
  AuthFlowError,
  AuthTokenBody,
  LoginRequest,
  LoginResponse,
  MessageResponse,
  PublicKeyBody,
  ResetPasswordRequest
} from './auth.models';

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'broker_auth_v1_access_token';
export const AUTH_LOGIN_TIME_STORAGE_KEY = 'broker_auth_v1_login_time';
export const AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY = 'broker_auth_v1_token_expires_at';

const TOKEN_EXPIRY_SKEW_MS = 10_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(AuthApiService);
  private readonly router = inject(Router);

  private readonly accessToken = signal<string | null>(this.readStoredToken());
  private readonly expiresAt = signal<number | null>(this.readStoredExpiresAt());
  private publicKey$?: Observable<ApiResponseWrapper<PublicKeyBody>>;

  readonly isAuthenticated = computed(() => {
    const token = this.accessToken();

    return typeof token === 'string' && token.length > 0 && !this.isExpired(this.expiresAt());
  });

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.encryptPassword(credentials.password).pipe(
      switchMap((password) => this.api.login({
        ...credentials,
        password,
        devicePlatform: 'WEB',
        deviceName: 'Admin Workstation'
      })),
      map((response) => this.unwrapLoginResponse(response, credentials.username)),
      tap((response) => this.persistSession(response.accessToken, response.expiresIn)),
      catchError((error) => throwError(() => error))
    );
  }

  prepareLoginEncryption(): void {
    this.getPublicKey().pipe(catchError(() => EMPTY)).subscribe();
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.api.forgotPassword(body).pipe(catchError((error) => throwError(() => error)));
  }

  resetPassword(body: ResetPasswordRequest): Observable<MessageResponse> {
    return this.api.resetPassword(body).pipe(catchError((error) => throwError(() => error)));
  }

  logout(navigate: boolean = true): void {
    this.clearSessionStorage();
    this.accessToken.set(null);
    this.expiresAt.set(null);

    if (navigate) {
      void this.router.navigateByUrl('/login');
    }
  }

  handleSessionExpired(): void {
    const returnUrl = this.router.url;

    this.clearSessionStorage();
    this.accessToken.set(null);
    this.expiresAt.set(null);

    if (!returnUrl.startsWith('/login')) {
      void this.router.navigate(['/login'], {
        queryParams: returnUrl.startsWith('/app') ? { returnUrl } : undefined
      });
    }
  }

  getBearerToken(): string | null {
    const token = this.accessToken();

    if (!token) {
      return null;
    }

    if (this.isExpired(this.expiresAt())) {
      this.handleSessionExpired();
      return null;
    }

    return token;
  }

  persistSession(token: string, expiresInSeconds?: number): void {
    const expiresAt = this.resolveExpiresAt(token, expiresInSeconds);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, token);
      window.localStorage.setItem(AUTH_LOGIN_TIME_STORAGE_KEY, `${Date.now()}`);

      if (expiresAt) {
        window.localStorage.setItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY, `${expiresAt}`);
      } else {
        window.localStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY);
      }
    }

    this.accessToken.set(token);
    this.expiresAt.set(expiresAt);
  }

  private readStoredToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }

    return window.localStorage.getItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
  }

  private readStoredExpiresAt(): number | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = window.localStorage.getItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY);
    const value = raw ? Number(raw) : NaN;

    return Number.isFinite(value) && value > 0 ? value : null;
  }

  private clearSessionStorage(): void {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.removeItem(AUTH_ACCESS_TOKEN_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_LOGIN_TIME_STORAGE_KEY);
    window.localStorage.removeItem(AUTH_TOKEN_EXPIRES_AT_STORAGE_KEY);
  }

  private resolveExpiresAt(token: string, expiresInSeconds?: number): number | null {
    if (typeof expiresInSeconds === 'number' && expiresInSeconds > 0) {
      return Date.now() + expiresInSeconds * 1_000;
    }

    return readJwtExpiresAt(token);
  }

  private isExpired(expiresAt: number | null): boolean {
    return typeof expiresAt === 'number' && expiresAt - TOKEN_EXPIRY_SKEW_MS <= Date.now();
  }

  private encryptPassword(password: string): Observable<string> {
    return this.getPublicKey().pipe(
      map((response) => this.unwrapResponse(response)),
      switchMap((body) => crypto.subtle.importKey(
        'spki',
        decodeBase64Key(body.publicKey ?? ''),
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['encrypt']
      )),
      switchMap((key) => crypto.subtle.encrypt(
        { name: 'RSA-OAEP' },
        key,
        new TextEncoder().encode(password)
      )),
      map((encrypted) => arrayBufferToBase64(encrypted))
    );
  }

  private getPublicKey(): Observable<ApiResponseWrapper<PublicKeyBody>> {
    this.publicKey$ ??= this.api.getPublicKey().pipe(shareReplay({ bufferSize: 1, refCount: false }));
    return this.publicKey$;
  }

  private unwrapLoginResponse(response: ApiResponseWrapper<AuthTokenBody> | LoginResponse, username: string): LoginResponse {
    if ('accessToken' in response && typeof response.accessToken === 'string') {
      return response;
    }

    const wrapped = response as ApiResponseWrapper<AuthTokenBody>;
    const body = this.unwrapResponse(wrapped);

    if (!body.accessToken) {
      throw new AuthFlowError('validation', 'Login succeeded without an access token.');
    }

    return {
      accessToken: body.accessToken,
      refreshToken: body.refreshToken,
      expiresIn: body.expiresIn,
      user: { username },
      warningMessage: wrapped.status === 'WARN_POPUP' ? wrapped.messageLocale || wrapped.message : undefined
    };
  }

  private unwrapResponse<TBody>(response: ApiResponseWrapper<TBody>): TBody {
    const message = response.messageLocale || response.message || 'Request failed.';

    switch (response.status ?? 'SUCCESS') {
      case 'SUCCESS':
      case 'WARN_POPUP':
        if (response.body === undefined || response.body === null) {
          throw new AuthFlowError('validation', 'Response body is missing.');
        }
        return response.body;
      case 'VALIDATION_FAIL':
        throw new AuthFlowError('validation', message);
      case 'ERROR_POPUP':
        throw new AuthFlowError('popup', message);
      case 'FATAL_CRASH':
        void this.router.navigateByUrl('/system-offline');
        throw new AuthFlowError('fatal', message);
    }
  }
}

function decodeBase64Key(value: string): ArrayBuffer {
  const normalized = value
    .replace(/-----BEGIN PUBLIC KEY-----/g, '')
    .replace(/-----END PUBLIC KEY-----/g, '')
    .replace(/\s/g, '');

  if (!normalized) {
    throw new AuthFlowError('validation', 'Public key is missing.');
  }

  return Uint8Array.from(atob(normalized), (char) => char.charCodeAt(0)).buffer;
}

function readJwtExpiresAt(token: string): number | null {
  const [, payload] = token.split('.');

  if (!payload) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    const parsed = JSON.parse(atob(padded)) as { exp?: unknown };

    return typeof parsed.exp === 'number' ? parsed.exp * 1_000 : null;
  } catch {
    return null;
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

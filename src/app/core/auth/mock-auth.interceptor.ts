import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ForgotPasswordResponse,
  LoginResponse,
  MessageResponse,
  ResetTokenValidResponse
} from './auth.models';

interface ResetTokenRecord {
  email: string;
  expiresAtMs: number;
}

interface MarketFeederSession {
  accessToken: string;
  refreshToken: string;
  expiresAtMs: number;
}

const resetTokenStore = new Map<string, ResetTokenRecord>();
const marketFeederSessionStore = new Map<string, MarketFeederSession>();

const DEMO_EMAIL = 'demo@broker.local';
const DEMO_PASSWORD = 'Password1!';

const RESET_TTL_MS = 15 * 60 * 1000;

function pathname(url: string): string {
  try {
    return new URL(url, 'https://local.invalid').pathname;
  } catch {
    return url;
  }
}

function jsonResponse<T>(body: T, status = 200): Observable<HttpResponse<T>> {
  return of(new HttpResponse<T>({ status, body }));
}

function issueResetToken(email: string): string {
  const bytes = new Uint8Array(24);

  crypto.getRandomValues(bytes);

  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  resetTokenStore.set(token, {
    email: email.trim().toLowerCase(),
    expiresAtMs: Date.now() + RESET_TTL_MS
  });

  return token;
}

function readUrlToken(req: HttpRequest<unknown>): string | null {
  try {
    const url = new URL(req.url, 'https://local.invalid');

    return url.searchParams.get('token');
  } catch {
    return null;
  }
}

function issueMarketFeederTokens(username: string): {
  access_token: string;
  refresh_token: string;
  expires_in: number;
} {
  const entropy = crypto.randomUUID().replace(/-/g, '');
  const accessToken = `mock-feeder-access-${username}-${entropy}`;
  const refreshToken = `mock-feeder-refresh-${username}-${entropy}`;
  const expiresIn = 900;

  marketFeederSessionStore.set(refreshToken, {
    accessToken,
    refreshToken,
    expiresAtMs: Date.now() + expiresIn * 1_000
  });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: expiresIn
  };
}

export const mockAuthInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.useMockAuth) {
    return next(req);
  }

  const path = pathname(req.url);

  if (!path.startsWith(`${environment.apiUrl}/auth`)) {
    const marketAuthPath = (() => {
      try {
        return new URL(environment.marketData.authHttpUrl, 'https://local.invalid').pathname;
      } catch {
        return environment.marketData.authHttpUrl;
      }
    })();

    if (!environment.marketData.useMockAuth || !path.startsWith(marketAuthPath)) {
      return next(req);
    }

    if (req.method === 'POST' && path.endsWith('/login')) {
      const body = req.body as { username?: string; password?: string };

      if (!body?.username || !body?.password) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 400,
              statusText: 'Bad Request',
              error: { message: 'Username and password are required.' }
            })
        );
      }

      return jsonResponse(issueMarketFeederTokens(body.username));
    }

    if (req.method === 'POST' && path.endsWith('/refresh')) {
      const body = req.body as { refresh_token?: string };
      const refreshToken = typeof body?.refresh_token === 'string' ? body.refresh_token : '';
      const existingSession = marketFeederSessionStore.get(refreshToken);

      if (!existingSession) {
        return throwError(
          () =>
            new HttpErrorResponse({
              status: 401,
              statusText: 'Unauthorized',
              error: { message: 'Refresh token is invalid or expired.' }
            })
        );
      }

      marketFeederSessionStore.delete(refreshToken);

      return jsonResponse(issueMarketFeederTokens('awad'));
    }

    return next(req);
  }

  if (req.method === 'POST' && path.endsWith('/auth/login')) {
    const body = req.body as { email?: string; password?: string };

    if (body?.email === DEMO_EMAIL && body?.password === DEMO_PASSWORD) {
      const response: LoginResponse = {
        accessToken: `mock-access-${Date.now().toString(36)}`,
        user: { email: body.email }
      };

      return jsonResponse(response);
    }

    return throwError(
      () =>
        new HttpErrorResponse({
          status: 401,
          statusText: 'Unauthorized',
          error: { message: 'Invalid email or password.' }
        })
    );
  }

  if (req.method === 'POST' && path.endsWith('/auth/forgot-password')) {
    const body = req.body as { email?: string };
    const email = typeof body?.email === 'string' ? body.email : '';

    const baseResponse: ForgotPasswordResponse = {
      message:
        'If an account exists for that email, you will receive password reset instructions shortly.'
    };

    if (!email.trim()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'Email is required.' }
          })
      );
    }

    const token = issueResetToken(email);

    if (environment.exposeResetTokenInMock) {
      const resetUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}/reset-password?token=${encodeURIComponent(token)}`
          : `/reset-password?token=${encodeURIComponent(token)}`;

      return jsonResponse({
        ...baseResponse,
        resetToken: token,
        resetUrl
      });
    }

    return jsonResponse(baseResponse);
  }

  if (req.method === 'GET' && path.endsWith('/auth/reset-password/validate')) {
    const token = readUrlToken(req);

    if (!token) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'Reset token is required.' }
          })
      );
    }

    const record = resetTokenStore.get(token);

    if (!record || record.expiresAtMs < Date.now()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'This reset link is invalid or has expired.' }
          })
      );
    }

    const response: ResetTokenValidResponse = { valid: true };

    return jsonResponse(response);
  }

  if (req.method === 'POST' && path.endsWith('/auth/reset-password')) {
    const body = req.body as { token?: string; password?: string };
    const token = typeof body?.token === 'string' ? body.token : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!token || !password) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'Token and password are required.' }
          })
      );
    }

    const record = resetTokenStore.get(token);

    if (!record || record.expiresAtMs < Date.now()) {
      return throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            statusText: 'Bad Request',
            error: { message: 'This reset link is invalid or has expired.' }
          })
      );
    }

    resetTokenStore.delete(token);

    const response: MessageResponse = {
      message: 'Your password has been updated. You can sign in with your new password.'
    };

    return jsonResponse(response);
  }

  return next(req);
};

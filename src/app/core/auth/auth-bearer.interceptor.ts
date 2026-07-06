import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const skipBearerPathSuffixes = [
  '/auth/login',
  '/v1/auth/login',
  '/auth/refresh',
  '/v1/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/reset-password/validate'
];

const publicAuthPathSuffixes = [
  '/auth/login',
  '/v1/auth/login',
  '/auth/public-key',
  '/v1/auth/public-key',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/reset-password/validate'
];

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes(`${environment.apiUrl}/`)) {
    return next(req);
  }

  const auth = inject(AuthService);

  if (skipBearerPathSuffixes.some((suffix) => req.url.includes(suffix))) {
    return next(req).pipe(
      catchError((error: unknown) => {
        handleExpiredSession(error, req.url, auth);
        return throwError(() => error);
      })
    );
  }

  const token = auth.getBearerToken();

  const authReq = token
    ? req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
    : req;

  return next(authReq).pipe(
    catchError((error: unknown) => {
      handleExpiredSession(error, req.url, auth);
      return throwError(() => error);
    })
  );
};

function handleExpiredSession(error: unknown, url: string, auth: AuthService): void {
  if (!(error instanceof HttpErrorResponse)) {
    return;
  }

  if (publicAuthPathSuffixes.some((suffix) => url.includes(suffix))) {
    return;
  }

  const refreshFailed = isRefreshRequest(url) && [400, 401, 403, 422].includes(error.status);

  if (refreshFailed || error.status === 401 || error.status === 403) {
    auth.handleSessionExpired();
  }
}

function isRefreshRequest(url: string): boolean {
  return url.includes('/auth/refresh') || url.includes('/v1/auth/refresh');
}

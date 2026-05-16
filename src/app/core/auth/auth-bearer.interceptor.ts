import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const skipBearerPathSuffixes = [
  '/auth/login',
  '/v1/auth/login',
  '/v1/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/reset-password/validate'
];

export const authBearerInterceptor: HttpInterceptorFn = (req, next) => {
  if (!req.url.includes(`${environment.apiUrl}/`)) {
    return next(req);
  }

  if (skipBearerPathSuffixes.some((suffix) => req.url.includes(suffix))) {
    return next(req);
  }

  const auth = inject(AuthService);
  const token = auth.getBearerToken();

  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    })
  );
};

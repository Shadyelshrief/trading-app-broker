import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router, RouterStateSnapshot } from '@angular/router';

import { AuthService } from './auth.service';

function requireAuth(state: RouterStateSnapshot) {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
}

export const authGuard: CanActivateFn = (_route, state) => requireAuth(state);
export const authChildGuard: CanActivateChildFn = (_route, state) => requireAuth(state);

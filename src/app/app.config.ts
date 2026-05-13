import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { authBearerInterceptor } from './core/auth/auth-bearer.interceptor';
import { mockAuthInterceptor } from './core/auth/mock-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(
      routes,
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition }) => {
          if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
            transition.skipTransition();
          }
        }
      })
    ),
    provideHttpClient(withInterceptors([mockAuthInterceptor, authBearerInterceptor]))
  ]
};

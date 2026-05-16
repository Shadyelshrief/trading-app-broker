import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { routes } from './app.routes';
import { authBearerInterceptor } from './core/auth/auth-bearer.interceptor';
import { mockAuthInterceptor } from './core/auth/mock-auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([mockAuthInterceptor, authBearerInterceptor]))
  ]
};

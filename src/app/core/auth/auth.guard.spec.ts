import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AuthApiService } from './auth-api.service';
import { AUTH_ACCESS_TOKEN_STORAGE_KEY, AuthService } from './auth.service';
import { authChildGuard, authGuard } from './auth.guard';

describe('auth guards', () => {
  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, AuthApiService, provideHttpClient(), provideRouter([])]
    });
  });

  afterEach(() => window.localStorage.clear());

  it('redirects app routes to login when there is no session', () => {
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as never, { url: '/app/pricing/full-market' } as never)
    );

    expect(result.toString()).toBe('/login?returnUrl=%2Fapp%2Fpricing%2Ffull-market');
  });

  it('guards child app routes too', () => {
    window.localStorage.setItem(AUTH_ACCESS_TOKEN_STORAGE_KEY, 'unit-test-token');
    TestBed.inject(AuthService).persistSession('unit-test-token');

    const result = TestBed.runInInjectionContext(() =>
      authChildGuard({} as never, { url: '/app/trading/order-entry' } as never)
    );

    expect(result).toBeTrue();
  });
});

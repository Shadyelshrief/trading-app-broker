import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { AuthApiService } from './auth-api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, AuthApiService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('should persist a session after successful login', () => {
    expect(service.isAuthenticated()).toBeFalse();

    service.login({ email: 'demo@broker.local', password: 'Password1!' }).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/login`);

    expect(request.request.method).toBe('POST');
    request.flush({ accessToken: 'unit-test-token', user: { email: 'demo@broker.local' } });

    expect(service.isAuthenticated()).toBeTrue();
    expect(window.localStorage.getItem('broker_auth_v1_access_token')).toBe('unit-test-token');
  });

  it('should clear the session on logout', () => {
    window.localStorage.setItem('broker_auth_v1_access_token', 'unit-test-token');
    service.persistSession('unit-test-token');

    expect(service.isAuthenticated()).toBeTrue();

    service.logout(false);

    expect(service.isAuthenticated()).toBeFalse();
    expect(window.localStorage.getItem('broker_auth_v1_access_token')).toBeNull();
  });
});

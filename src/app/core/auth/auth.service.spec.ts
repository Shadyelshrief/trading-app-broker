import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApiService } from './auth-api.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

const TEST_PUBLIC_KEY =
  'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsfFL9jEuhyO2w4VDqKYg37U98YGmjQUG+h2AyFP2zmfZYCKJ35pySMKsulGbfOGTkFAwCvj3rDTpWstznJnwcBzVYRR/9K7cMHupIJY29VjCe8wfIMzN/iGRmLflgsFovGyqwT4JZ+56qAD1wRrPTQp1GGpaO4JuqAe7Y4sXMz96dFYQ4YixvWmJ6Sx7JxLvHSaBwrIgPe1WLnZd6i0M9LYS61QxyKMGcmoDSUbAg6abQSEUrKkvhzv5G0NvZkv+Sdvjtqu+wvkoUDrbTP8vC4F1FYIJYH6z8pfUS/47b4BdefcHqnX7LTKNvvIT8kbBFS2aQTfrNBVlJhyKN1Ob6QIDAQAB';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    window.localStorage.clear();

    TestBed.configureTestingModule({
      providers: [AuthService, AuthApiService, provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    window.localStorage.clear();
  });

  it('should encrypt the password and persist a session after successful login', async () => {
    expect(service.isAuthenticated()).toBeFalse();

    const loginPromise = firstValueFrom(service.login({ username: 'awad', password: 'Password1!' }));

    const publicKeyRequest = httpMock.expectOne(`${environment.apiUrl}/auth/public-key`);

    expect(publicKeyRequest.request.method).toBe('GET');
    publicKeyRequest.flush({ status: 'SUCCESS', body: { publicKey: TEST_PUBLIC_KEY } });

    await new Promise((resolve) => setTimeout(resolve));

    const request = httpMock.expectOne(`${environment.apiUrl}/auth/login`);

    expect(request.request.method).toBe('POST');
    expect(request.request.body.username).toBe('awad');
    expect(request.request.body.devicePlatform).toBe('WEB');
    expect(request.request.body.deviceName).toBe('Admin Workstation');
    expect(request.request.body.password).not.toBe('Password1!');
    request.flush({ status: 'SUCCESS', body: { accessToken: 'unit-test-token' } });

    await loginPromise;

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

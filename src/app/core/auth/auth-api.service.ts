import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ApiResponseWrapper,
  AdminLoginRequest,
  AuthTokenBody,
  LoginResponse,
  MessageResponse,
  PublicKeyBody,
  ResetPasswordRequest,
  ResetTokenValidResponse
} from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly http = inject(HttpClient);

  private readonly base = `${environment.apiUrl}/auth`;

  getPublicKey(): Observable<ApiResponseWrapper<PublicKeyBody>> {
    return this.http.get<ApiResponseWrapper<PublicKeyBody>>(`${this.base}/public-key`);
  }

  login(body: AdminLoginRequest): Observable<ApiResponseWrapper<AuthTokenBody> | LoginResponse> {
    return this.http.post<ApiResponseWrapper<AuthTokenBody> | LoginResponse>(`${this.base}/login`, body);
  }

  forgotPassword(body: ForgotPasswordRequest): Observable<ForgotPasswordResponse> {
    return this.http.post<ForgotPasswordResponse>(`${this.base}/forgot-password`, body);
  }

  validateResetToken(token: string): Observable<ResetTokenValidResponse> {
    const params = new HttpParams().set('token', token);

    return this.http.get<ResetTokenValidResponse>(`${this.base}/reset-password/validate`, { params });
  }

  resetPassword(body: ResetPasswordRequest): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.base}/reset-password`, body);
  }
}

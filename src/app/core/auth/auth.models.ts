export interface AuthUser {
  username: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface AdminLoginRequest extends LoginRequest {
  devicePlatform: string;
  deviceName: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
  warningMessage?: string;
}

export type ApiResponseStatus = 'SUCCESS' | 'WARN_POPUP' | 'VALIDATION_FAIL' | 'ERROR_POPUP' | 'FATAL_CRASH';

export type AuthFlowErrorKind = 'validation' | 'popup' | 'fatal';

export class AuthFlowError extends Error {
  constructor(
    readonly kind: AuthFlowErrorKind,
    message: string
  ) {
    super(message);
    this.name = 'AuthFlowError';
  }
}

export interface ApiResponseWrapper<TBody> {
  status?: ApiResponseStatus;
  message?: string;
  messageLocale?: string;
  body?: TBody;
}

export interface PublicKeyBody {
  publicKey?: string;
}

export interface AuthTokenBody {
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

export interface ResetTokenValidResponse {
  valid: true;
}

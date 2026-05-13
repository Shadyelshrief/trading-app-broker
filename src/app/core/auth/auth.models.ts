export interface AuthUser {
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ForgotPasswordResponse {
  message: string;
  /** Present only when `environment.exposeResetTokenInMock` is true (mock backend). */
  resetToken?: string;
  resetUrl?: string;
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

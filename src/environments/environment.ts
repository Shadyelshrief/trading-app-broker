export const environment = {
  production: false,
  apiUrl: '/api',
  /** When true, auth HTTP calls are satisfied by `mockAuthInterceptor` without a real backend. */
  useMockAuth: true,
  /**
   * When true (development default), forgot-password API may return a `resetToken` for local QA.
   * Must remain false in production builds.
   */
  exposeResetTokenInMock: true
};

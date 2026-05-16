export const environment = {
  production: false,
  apiUrl: '/api',
  /** When true, auth HTTP calls are satisfied by `mockAuthInterceptor` without a real backend. */
  useMockAuth: true,
  /**
   * When true (development default), forgot-password API may return a `resetToken` for local QA.
   * Must remain false in production builds.
   */
  exposeResetTokenInMock: true,
  marketData: {
    useMockAuth: false,
    enableAutoReconnect: false,
    authHttpUrl: '/feeder-api/v1/auth',
    webSocketUrl: 'ws://localhost:4200/feeder-ws/stream',
    credentials: {
      username: 'awad',
      password: 'password123'
    },
    refreshWindowMs: 60_000,
    reconnect: {
      initialDelayMs: 1_000,
      maxDelayMs: 30_000,
      authInitialDelayMs: 1_000,
      authMaxDelayMs: 10_000,
      maxAuthRetries: 3
    }
  }
};

export const environment = {
  production: true,
  apiUrl: '/api',
  useMockAuth: true,
  exposeResetTokenInMock: false,
  marketData: {
    useMockAuth: false,
    enableAutoReconnect: true,
    authHttpUrl: 'http://localhost:7070/api/v1/auth',
    webSocketUrl: 'ws://localhost:7070/ws/stream',
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

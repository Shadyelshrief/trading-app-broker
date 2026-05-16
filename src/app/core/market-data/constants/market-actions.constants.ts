export const MARKET_ACTIONS = {
  authenticate: 'authenticate',
  subscribe: 'subscribe',
  subscribeBulk: 'subscribe_bulk',
  unsubscribe: 'unsubscribe'
} as const;

export const AUTHENTICATION_GRACE_PERIOD_MS = 3_000;

export const TOPIC_BATCH_DEBOUNCE_MS = 20;

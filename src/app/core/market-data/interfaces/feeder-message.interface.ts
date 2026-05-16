import { MARKET_ACTIONS } from '../constants/market-actions.constants';

export type FeederAction = (typeof MARKET_ACTIONS)[keyof typeof MARKET_ACTIONS];

export interface FeederAuthenticateMessage {
  action: typeof MARKET_ACTIONS.authenticate;
  token: string;
}

export interface FeederSubscribeMessage {
  action: typeof MARKET_ACTIONS.subscribe;
  target: string;
}

export interface FeederSubscribeBulkMessage {
  action: typeof MARKET_ACTIONS.subscribeBulk;
  targets: string[];
}

export interface FeederUnsubscribeMessage {
  action: typeof MARKET_ACTIONS.unsubscribe;
  target: string;
}

export type FeederOutboundMessage =
  | FeederAuthenticateMessage
  | FeederSubscribeMessage
  | FeederSubscribeBulkMessage
  | FeederUnsubscribeMessage;

export interface FeederErrorPayload {
  code?: string;
  message?: string;
}

export interface FeederInboundMessage<TPayload = unknown> {
  action?: string;
  event?: string;
  type?: string;
  target?: string;
  topic?: string;
  payload?: TPayload;
  data?: TPayload;
  body?: TPayload;
  timestamp?: number | string;
  sequence?: number;
  snapshot?: boolean;
  success?: boolean;
  error?: string | FeederErrorPayload;
  [key: string]: unknown;
}

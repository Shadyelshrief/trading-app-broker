export type WebSocketConnectionStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'authenticating'
  | 'authenticated'
  | 'reconnecting'
  | 'auth-failed'
  | 'error';

export interface WebSocketState {
  status: WebSocketConnectionStatus;
  reconnectAttempt: number;
  connectedAt: number | null;
  authenticatedAt: number | null;
  lastMessageAt: number | null;
  lastError: string | null;
}

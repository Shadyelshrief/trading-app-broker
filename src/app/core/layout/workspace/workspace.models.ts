export const WORKSPACE_VERSION = 2;

export type WorkspaceRestoreState = 'IDLE' | 'RESTORING' | 'RESTORED' | 'PARTIAL' | 'FAILED';

export interface WorkspaceGlobalState {
  market?: string;
  index?: string;
  theme?: string;
  language?: string;
}

export interface WorkspaceWindowGeometry {
  left?: number;
  top?: number;
  width: number;
  height: number;
}

export interface SavedWorkspacePopout {
  id: string;
  componentType: string;
  componentState: Record<string, unknown>;
  title?: string;
  linkGroup?: string;
  geometry: WorkspaceWindowGeometry;
  monitor?: {
    screenX?: number;
    screenY?: number;
  };
  /** Persistence-safe Golden Layout child config used by the existing popout bootstrap. */
  layout: unknown;
}

export interface SavedWorkspace {
  id: string;
  name: string;
  version: number;
  mainLayout: unknown;
  popouts: SavedWorkspacePopout[];
  globalState: WorkspaceGlobalState;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkspacePopoutRuntimeSnapshot {
  id: string;
  layout: unknown;
  geometry: WorkspaceWindowGeometry;
}

export type WorkspaceMessageType =
  | 'SYMBOL_CHANGED'
  | 'MARKET_CHANGED'
  | 'INDEX_CHANGED'
  | 'LINK_GROUP_EVENT'
  | 'THEME_CHANGED'
  | 'LANGUAGE_CHANGED'
  | 'FEED_STATUS'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'WORKSPACE_RESET';

export interface WorkspaceMessage<TPayload = unknown> {
  type: WorkspaceMessageType;
  sourceWindowId: string;
  payload?: TPayload;
}

export interface WorkspaceRestoreResult {
  requested: number;
  opened: number;
  blocked: number;
}

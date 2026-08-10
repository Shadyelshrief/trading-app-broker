import type { ResolvedPopoutLayoutConfig } from 'golden-layout';

export interface WorkspacePopoutScreen {
  availableWidth: number;
  availableHeight: number;
  availableLeft?: number;
  availableTop?: number;
}

export type WorkspacePopoutConfigPreparation = 'not-popout' | 'ready' | 'restored' | 'missing';

export interface WorkspacePopoutStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const GOLDEN_LAYOUT_WINDOW_PARAM = 'gl-window';
const GOLDEN_LAYOUT_CONFIG_PREFIX = 'gl-window-config-';
const WORKSPACE_POPOUT_BACKUP_PREFIX = 'broker-workspace-popout:';

export function calculateWorkspacePopoutBounds(screen: WorkspacePopoutScreen): ResolvedPopoutLayoutConfig.Window {
  const availableWidth = Math.max(1, screen.availableWidth);
  const availableHeight = Math.max(1, screen.availableHeight);
  const width = Math.floor(availableWidth * 0.5);
  const height = Math.floor(availableHeight * 0.5);
  const availableLeft = screen.availableLeft ?? 0;
  const availableTop = screen.availableTop ?? 0;

  return {
    width,
    height,
    left: Math.round(availableLeft + (availableWidth - width) / 2),
    top: Math.round(availableTop + (availableHeight - height) / 2)
  };
}

export function getWorkspacePopoutConfigKey(href: string): string | null {
  try {
    const key = new URL(href).searchParams.get(GOLDEN_LAYOUT_WINDOW_PARAM);
    return key?.startsWith(GOLDEN_LAYOUT_CONFIG_PREFIX) ? key : null;
  } catch {
    return null;
  }
}

export function isWorkspacePopoutUrl(href: string): boolean {
  return getWorkspacePopoutConfigKey(href) !== null;
}

export function prepareWorkspacePopoutConfig(
  href: string,
  sharedStorage: WorkspacePopoutStorage,
  windowStorage: WorkspacePopoutStorage
): WorkspacePopoutConfigPreparation {
  const configKey = getWorkspacePopoutConfigKey(href);

  if (!configKey) {
    return 'not-popout';
  }

  const backupKey = `${WORKSPACE_POPOUT_BACKUP_PREFIX}${configKey}`;

  try {
    const initialConfig = sharedStorage.getItem(configKey);

    if (isGoldenLayoutConfig(initialConfig)) {
      windowStorage.setItem(backupKey, initialConfig);
      return 'ready';
    }

    const backupConfig = windowStorage.getItem(backupKey);

    if (isGoldenLayoutConfig(backupConfig)) {
      sharedStorage.setItem(configKey, backupConfig);
      return 'restored';
    }
  } catch {
    return 'missing';
  }

  return 'missing';
}

function isGoldenLayoutConfig(value: string | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const parsed = JSON.parse(value);
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
  } catch {
    return false;
  }
}

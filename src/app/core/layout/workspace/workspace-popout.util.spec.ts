import {
  WorkspacePopoutStorage,
  calculateWorkspacePopoutBounds,
  clampWorkspacePopoutGeometry,
  getWorkspacePopoutConfigKey,
  prepareWorkspacePopoutConfig
} from './workspace-popout.util';

describe('calculateWorkspacePopoutBounds', () => {
  it('opens a large window centered within the available screen', () => {
    expect(calculateWorkspacePopoutBounds({
      availableWidth: 1920,
      availableHeight: 1000,
      availableLeft: 1920,
      availableTop: 0
    })).toEqual({
      width: 960,
      height: 500,
      left: 2400,
      top: 250
    });
  });

  it('uses half of a smaller screen as well', () => {
    expect(calculateWorkspacePopoutBounds({ availableWidth: 900, availableHeight: 650 })).toEqual({
      width: 450,
      height: 325,
      left: 225,
      top: 163
    });
  });

  it('clamps a saved window back onto a visible screen', () => {
    expect(clampWorkspacePopoutGeometry(
      { left: 5000, top: 4000, width: 900, height: 700 },
      [{ left: 0, top: 0, width: 1920, height: 1040 }]
    )).toEqual({ left: 1020, top: 340, width: 900, height: 700 });
  });

  it('backs up the one-time Golden Layout configuration before it is consumed', () => {
    const shared = new MemoryStorage();
    const windowStorage = new MemoryStorage();
    const key = 'gl-window-config-abc123';
    const config = JSON.stringify({ root: { type: 'component', componentType: 'order-entry' } });
    shared.setItem(key, config);

    expect(prepareWorkspacePopoutConfig(`http://localhost/app?gl-window=${key}`, shared, windowStorage)).toBe('ready');
    expect(windowStorage.getItem(`broker-workspace-popout:${key}`)).toBe(config);
  });

  it('restores the Golden Layout configuration when a detached window refreshes', () => {
    const shared = new MemoryStorage();
    const windowStorage = new MemoryStorage();
    const key = 'gl-window-config-refresh1';
    const config = JSON.stringify({ root: { type: 'component', componentType: 'order-monitoring' } });
    windowStorage.setItem(`broker-workspace-popout:${key}`, config);

    expect(prepareWorkspacePopoutConfig(`http://localhost/app?gl-window=${key}`, shared, windowStorage)).toBe('restored');
    expect(shared.getItem(key)).toBe(config);
  });

  it('detects stale detached windows without restoring the full application', () => {
    expect(prepareWorkspacePopoutConfig(
      'http://localhost/app?gl-window=gl-window-config-missing',
      new MemoryStorage(),
      new MemoryStorage()
    )).toBe('missing');
  });

  it('ignores unrelated query parameters', () => {
    expect(getWorkspacePopoutConfigKey('http://localhost/app?gl-window=unexpected')).toBeNull();
    expect(prepareWorkspacePopoutConfig(
      'http://localhost/app?workspace=default',
      new MemoryStorage(),
      new MemoryStorage()
    )).toBe('not-popout');
  });
});

class MemoryStorage implements WorkspacePopoutStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

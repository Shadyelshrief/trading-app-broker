import { firstValueFrom, take } from 'rxjs';

import { CrossWindowWorkspaceService, WorkspaceBroadcastChannel } from './cross-window-workspace.service';

describe('CrossWindowWorkspaceService', () => {
  let originalBroadcastChannel: typeof BroadcastChannel | undefined;
  let service: CrossWindowWorkspaceService;

  beforeEach(() => {
    originalBroadcastChannel = globalThis.BroadcastChannel;
    FakeBroadcastChannel.instances = [];
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      value: FakeBroadcastChannel
    });
    service = new CrossWindowWorkspaceService();
  });

  afterEach(() => {
    service.ngOnDestroy();
    Object.defineProperty(globalThis, 'BroadcastChannel', {
      configurable: true,
      value: originalBroadcastChannel
    });
  });

  it('receives symbol events from another workspace window', async () => {
    const received = firstValueFrom(service.observe<{ symbol: string }>('SYMBOL_CHANGED').pipe(take(1)));
    channel().emit({ type: 'SYMBOL_CHANGED', sourceWindowId: 'POP-1', payload: { symbol: 'ALDAR' } });

    expect((await received).payload?.symbol).toBe('ALDAR');
  });

  it('isolates link-group events', async () => {
    const received = firstValueFrom(service.observeLinkGroup<{ linkGroup: string; symbol: string }>('A').pipe(take(1)));
    channel().emit({ type: 'LINK_GROUP_EVENT', sourceWindowId: 'POP-1', payload: { linkGroup: 'B', symbol: 'EMAAR' } });
    channel().emit({ type: 'LINK_GROUP_EVENT', sourceWindowId: 'POP-2', payload: { linkGroup: 'A', symbol: 'ALDAR' } });

    expect((await received).payload?.symbol).toBe('ALDAR');
  });

  it('receives logout and theme synchronization messages', async () => {
    const logout = firstValueFrom(service.observe('LOGOUT').pipe(take(1)));
    const theme = firstValueFrom(service.observe<string>('THEME_CHANGED').pipe(take(1)));

    channel().emit({ type: 'THEME_CHANGED', sourceWindowId: 'POP-1', payload: 'light' });
    channel().emit({ type: 'LOGOUT', sourceWindowId: 'POP-1' });

    expect((await theme).payload).toBe('light');
    expect((await logout).type).toBe('LOGOUT');
  });

  it('publishes messages with the source window id', () => {
    service.publish('FEED_STATUS', { connected: true });

    expect(channel().posted[0]).toEqual(jasmine.objectContaining({
      type: 'FEED_STATUS',
      sourceWindowId: service.windowId
    }));
  });
});

function channel(): FakeBroadcastChannel {
  return FakeBroadcastChannel.instances[0];
}

class FakeBroadcastChannel implements WorkspaceBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];
  readonly posted: unknown[] = [];
  private listener?: (event: MessageEvent<unknown>) => void;

  constructor(_name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent<unknown>) => void): void {
    this.listener = listener;
  }

  removeEventListener(): void {
    this.listener = undefined;
  }

  postMessage(message: unknown): void {
    this.posted.push(message);
  }

  emit(data: unknown): void {
    this.listener?.({ data } as MessageEvent<unknown>);
  }

  close(): void {
    this.listener = undefined;
  }
}

import { Injectable, OnDestroy } from '@angular/core';
import { Observable, Subject, filter } from 'rxjs';

import { getWorkspacePopoutConfigKey } from './workspace-popout.util';
import { WorkspaceMessage, WorkspaceMessageType } from './workspace.models';

const WORKSPACE_CHANNEL = 'trading-workspace-v2';

export interface WorkspaceBroadcastChannel {
  addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
  postMessage(message: unknown): void;
  close(): void;
}

@Injectable({ providedIn: 'root' })
export class CrossWindowWorkspaceService implements OnDestroy {
  private readonly messagesSubject = new Subject<WorkspaceMessage>();
  private readonly channel = createChannel();
  readonly windowId = resolveWindowId();
  readonly messages$ = this.messagesSubject.asObservable();

  constructor() {
    this.channel?.addEventListener('message', this.handleMessage);
  }

  publish<TPayload>(type: WorkspaceMessageType, payload?: TPayload): void {
    const message: WorkspaceMessage<TPayload> = {
      type,
      sourceWindowId: this.windowId,
      payload
    };

    this.channel?.postMessage(message);
  }

  observe<TPayload = unknown>(type: WorkspaceMessageType): Observable<WorkspaceMessage<TPayload>> {
    return this.messages$.pipe(
      filter((message): message is WorkspaceMessage<TPayload> => message.type === type)
    );
  }

  observeLinkGroup<TPayload = unknown>(linkGroup: string): Observable<WorkspaceMessage<TPayload>> {
    return this.observe<TPayload & { linkGroup?: string }>('LINK_GROUP_EVENT').pipe(
      filter((message) => message.payload?.linkGroup === linkGroup)
    ) as Observable<WorkspaceMessage<TPayload>>;
  }

  ngOnDestroy(): void {
    this.channel?.removeEventListener('message', this.handleMessage);
    this.channel?.close();
    this.messagesSubject.complete();
  }

  private readonly handleMessage = ({ data }: MessageEvent<unknown>): void => {
    if (!isWorkspaceMessage(data) || data.sourceWindowId === this.windowId) {
      return;
    }

    this.messagesSubject.next(data);
  };
}

function createChannel(): WorkspaceBroadcastChannel | undefined {
  return typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(WORKSPACE_CHANNEL);
}

function resolveWindowId(): string {
  if (typeof window === 'undefined') {
    return 'MAIN';
  }

  const configKey = getWorkspacePopoutConfigKey(window.location.href);
  return configKey ? `POP-${configKey.replace('gl-window-config-', '').toUpperCase()}` : 'MAIN';
}

function isWorkspaceMessage(value: unknown): value is WorkspaceMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Record<string, unknown>;
  return typeof message['type'] === 'string' && typeof message['sourceWindowId'] === 'string';
}

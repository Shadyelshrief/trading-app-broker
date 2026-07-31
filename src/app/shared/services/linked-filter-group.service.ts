import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, EMPTY, Observable, Subject, distinctUntilChanged, filter, map, switchMap } from 'rxjs';

export type LinkedFilterGroupId = 'group-1' | 'group-2' | 'group-3';
export type LinkedFilterValue = string | number | boolean | null | object;
export type LinkedFilterState = Record<string, LinkedFilterValue | undefined>;

export interface LinkedFilterGroupOption {
  id: LinkedFilterGroupId;
  label: string;
  color: string;
}

export interface LinkedFilterEvent<TValue = LinkedFilterValue> {
  groupId: LinkedFilterGroupId;
  sourceId: string;
  field: string;
  value: TValue;
}

type LinkedFilterMessage =
  | ({ type: 'event' } & LinkedFilterEvent)
  | { type: 'state-request'; groupId: LinkedFilterGroupId; sourceId: string }
  | { type: 'state-response'; groupId: LinkedFilterGroupId; sourceId: string; targetId: string; state: LinkedFilterState };

const LINKED_FILTER_CHANNEL = 'broker-linked-filter-groups-v1';

export const LINKED_FILTER_GROUPS: readonly LinkedFilterGroupOption[] = [
  { id: 'group-1', label: 'Group 1', color: '#49d17d' },
  { id: 'group-2', label: 'Group 2', color: '#69a8ff' },
  { id: 'group-3', label: 'Group 3', color: '#f6c55b' }
];

@Injectable({ providedIn: 'root' })
export class LinkedFilterGroupService implements OnDestroy {
  private readonly eventsSubject = new Subject<LinkedFilterEvent>();
  private readonly groupStates = new Map<LinkedFilterGroupId, Map<string, LinkedFilterValue | undefined>>();
  private readonly instanceId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
  private readonly channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(LINKED_FILTER_CHANNEL);
  private idSeed = 0;

  constructor() {
    this.channel?.addEventListener('message', this.handleChannelMessage);
  }

  ngOnDestroy(): void {
    this.channel?.removeEventListener('message', this.handleChannelMessage);
    this.channel?.close();
  }

  createGroupSubject(initial: LinkedFilterGroupId | null = null): BehaviorSubject<LinkedFilterGroupId | null> {
    return new BehaviorSubject<LinkedFilterGroupId | null>(initial);
  }

  createSourceId(prefix: string): string {
    this.idSeed += 1;
    return `${this.instanceId}:${prefix}-${this.idSeed}`;
  }

  publish<TValue extends LinkedFilterValue>(
    groupId: LinkedFilterGroupId | null,
    sourceId: string,
    field: string,
    value: TValue
  ): void {
    if (!groupId) {
      return;
    }

    const event = { groupId, sourceId, field, value };
    this.applyEvent(event);
    this.channel?.postMessage({ type: 'event', ...event } satisfies LinkedFilterMessage);
  }

  joinGroup(
    groupId: LinkedFilterGroupId | null,
    sourceId: string,
    initialState: LinkedFilterState
  ): LinkedFilterState {
    if (!groupId) {
      return {};
    }

    const groupState = this.getGroupState(groupId);
    const existingState = Object.fromEntries(groupState.entries()) as LinkedFilterState;

    for (const [field, value] of Object.entries(initialState)) {
      if (!groupState.has(field)) {
        groupState.set(field, value);
      }
    }

    this.channel?.postMessage({ type: 'state-request', groupId, sourceId } satisfies LinkedFilterMessage);

    return existingState;
  }

  observe<TValue extends LinkedFilterValue>(
    group$: Observable<LinkedFilterGroupId | null>,
    sourceId: string,
    field: string
  ): Observable<TValue> {
    return group$.pipe(
      distinctUntilChanged(),
      switchMap((groupId) =>
        groupId
          ? this.eventsSubject.pipe(
              filter((event) => event.groupId === groupId && event.sourceId !== sourceId && event.field === field),
              map((event) => event.value as TValue)
            )
          : (EMPTY as Observable<TValue>)
      ),
      distinctUntilChanged(sameLinkedFilterValue)
    ) as Observable<TValue>;
  }

  private getGroupState(groupId: LinkedFilterGroupId): Map<string, LinkedFilterValue | undefined> {
    let state = this.groupStates.get(groupId);

    if (!state) {
      state = new Map<string, LinkedFilterValue | undefined>();
      this.groupStates.set(groupId, state);
    }

    return state;
  }

  private readonly handleChannelMessage = ({ data }: MessageEvent<unknown>): void => {
    if (!isLinkedFilterMessage(data)) {
      return;
    }

    if (data.type === 'event') {
      this.applyEvent(data);
      return;
    }

    if (data.type === 'state-request') {
      const state = this.groupStates.get(data.groupId);

      if (state?.size) {
        this.channel?.postMessage({
          type: 'state-response',
          groupId: data.groupId,
          sourceId: this.instanceId,
          targetId: data.sourceId,
          state: Object.fromEntries(state.entries()) as LinkedFilterState
        } satisfies LinkedFilterMessage);
      }
      return;
    }

    if (!data.targetId.startsWith(`${this.instanceId}:`)) {
      return;
    }

    for (const [field, value] of Object.entries(data.state)) {
      if (value !== undefined) {
        this.applyEvent({ groupId: data.groupId, sourceId: data.sourceId, field, value });
      }
    }
  };

  private applyEvent(event: LinkedFilterEvent): void {
    this.getGroupState(event.groupId).set(event.field, event.value);
    this.eventsSubject.next(event);
  }
}

export function normalizeLinkedFilterGroup(value: unknown): LinkedFilterGroupId | null {
  return LINKED_FILTER_GROUPS.some((group) => group.id === value) ? (value as LinkedFilterGroupId) : null;
}

export function readLinkedFilterGroupFromState(state: { context?: Record<string, unknown> } | undefined): LinkedFilterGroupId | null {
  return normalizeLinkedFilterGroup(state?.context?.['linkedFilterGroup']);
}

export function sameLinkedFilterValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) {
    return true;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  return JSON.stringify(left) === JSON.stringify(right);
}

function isLinkedFilterMessage(value: unknown): value is LinkedFilterMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const message = value as Record<string, unknown>;

  if (normalizeLinkedFilterGroup(message['groupId']) === null || typeof message['sourceId'] !== 'string') {
    return false;
  }

  if (message['type'] === 'event') {
    return typeof message['field'] === 'string';
  }

  if (message['type'] === 'state-request') {
    return true;
  }

  return message['type'] === 'state-response' &&
    typeof message['targetId'] === 'string' &&
    !!message['state'] &&
    typeof message['state'] === 'object' &&
    !Array.isArray(message['state']);
}

import { Injectable } from '@angular/core';
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

export const LINKED_FILTER_GROUPS: readonly LinkedFilterGroupOption[] = [
  { id: 'group-1', label: 'Group 1', color: '#49d17d' },
  { id: 'group-2', label: 'Group 2', color: '#69a8ff' },
  { id: 'group-3', label: 'Group 3', color: '#f6c55b' }
];

@Injectable({ providedIn: 'root' })
export class LinkedFilterGroupService {
  private readonly eventsSubject = new Subject<LinkedFilterEvent>();
  private readonly groupStates = new Map<LinkedFilterGroupId, Map<string, LinkedFilterValue | undefined>>();
  private idSeed = 0;

  createGroupSubject(initial: LinkedFilterGroupId | null = null): BehaviorSubject<LinkedFilterGroupId | null> {
    return new BehaviorSubject<LinkedFilterGroupId | null>(initial);
  }

  createSourceId(prefix: string): string {
    this.idSeed += 1;
    return `${prefix}-${this.idSeed}`;
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

    this.getGroupState(groupId).set(field, value);
    this.eventsSubject.next({ groupId, sourceId, field, value });
  }

  joinGroup(
    groupId: LinkedFilterGroupId | null,
    _sourceId: string,
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

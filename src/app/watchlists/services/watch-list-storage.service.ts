import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { WatchListConfig } from '../saved-watch-list/saved-watch-list.models';

const STORAGE_KEY = 'broker-watch-lists-v1';

@Injectable({ providedIn: 'root' })
export class WatchListStorageService {
  private readonly listsSubject = new BehaviorSubject<WatchListConfig[]>(this.read());
  readonly watchLists$ = this.listsSubject.asObservable();

  getSnapshot(): WatchListConfig[] {
    return [...this.listsSubject.value];
  }

  saveAll(lists: WatchListConfig[]): void {
    const ordered = [...lists].sort((left, right) => right.updatedAt - left.updatedAt);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ordered));
    this.listsSubject.next(ordered);
  }

  private read(): WatchListConfig[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isWatchListConfig) : [];
    } catch {
      return [];
    }
  }
}

function isWatchListConfig(value: unknown): value is WatchListConfig {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Partial<WatchListConfig>;
  return typeof record.id === 'string' && typeof record.name === 'string';
}

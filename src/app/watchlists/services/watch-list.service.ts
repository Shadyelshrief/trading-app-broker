import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { WatchListConfig } from '../saved-watch-list/saved-watch-list.models';
import { WatchListStorageService } from './watch-list-storage.service';

@Injectable({ providedIn: 'root' })
export class WatchListService {
  private readonly storage = inject(WatchListStorageService);

  getWatchLists(): Observable<WatchListConfig[]> {
    return this.storage.watchLists$;
  }

  getWatchList(id: string): Observable<WatchListConfig | null> {
    return this.storage.watchLists$.pipe(
      map((lists) => lists.find((list) => list.id === id) ?? null)
    );
  }

  createWatchList(config: WatchListConfig): Observable<WatchListConfig> {
    this.storage.saveAll([...this.storage.getSnapshot(), config]);
    return of(config);
  }

  updateWatchList(config: WatchListConfig): Observable<WatchListConfig> {
    const next = this.storage.getSnapshot().map((list) => (list.id === config.id ? config : list));
    this.storage.saveAll(next.some((list) => list.id === config.id) ? next : [...next, config]);
    return of(config);
  }

  deleteWatchList(id: string): Observable<void> {
    this.storage.saveAll(this.storage.getSnapshot().filter((list) => list.id !== id));
    return of(undefined);
  }
}

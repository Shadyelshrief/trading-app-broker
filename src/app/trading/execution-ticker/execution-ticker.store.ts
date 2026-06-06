import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, EMPTY, catchError, finalize, of, tap } from 'rxjs';

import { ExecutionTickerFeedService } from './execution-ticker-feed.service';
import { ExecutionTickerRow } from './execution-ticker.models';

interface ExecutionTickerStoreState {
  rows: ExecutionTickerRow[];
  loading: boolean;
  error?: string;
  lastUpdated?: number;
}

const INITIAL_STATE: ExecutionTickerStoreState = {
  rows: [],
  loading: false
};

@Injectable({ providedIn: 'root' })
export class ExecutionTickerStore {
  private readonly feed = inject(ExecutionTickerFeedService);
  private readonly stateSubject = new BehaviorSubject<ExecutionTickerStoreState>(INITIAL_STATE);
  private readonly seenIds = new Set<string>();
  private started = false;

  readonly state$ = this.stateSubject.asObservable();

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;
    this.patchState({ loading: true, error: undefined });

    this.feed
      .getExecutionsSinceLogin()
      .pipe(
        tap((rows) => rows.forEach((row) => this.addExecution(row))),
        catchError((error) => {
          this.patchState({
            error: error instanceof Error ? error.message : 'Unable to load executions since login.'
          });
          return of([]);
        }),
        finalize(() => this.patchState({ loading: false }))
      )
      .subscribe();

    this.feed
      .observeExecutions()
      .pipe(
        catchError((error) => {
          this.patchState({
            loading: false,
            error: error instanceof Error ? error.message : 'Unable to observe private execution feed.'
          });
          return EMPTY;
        })
      )
      .subscribe((row) => this.addExecution(row));
  }

  getSnapshot(): ExecutionTickerRow[] {
    return this.stateSubject.value.rows;
  }

  private addExecution(row: ExecutionTickerRow): void {
    if (this.seenIds.has(row.id)) {
      return;
    }

    this.seenIds.add(row.id);
    const nextRows = [row, ...this.stateSubject.value.rows].slice(0, 5000);

    this.patchState({
      rows: nextRows,
      loading: false,
      error: undefined,
      lastUpdated: row.receivedAt
    });
  }

  private patchState(patch: Partial<ExecutionTickerStoreState>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...patch
    });
  }
}

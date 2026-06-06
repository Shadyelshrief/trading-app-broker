import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, finalize, of } from 'rxjs';

import { ClientService } from '../services/client.service';
import type { ClientSearchFilters, ClientSearchViewModel } from './client-search.models';

const initialViewModel: ClientSearchViewModel = {
  rows: [],
  loading: false
};

@Injectable()
export class ClientSearchFacade {
  private readonly service = inject(ClientService);
  private readonly stateSubject = new BehaviorSubject<ClientSearchViewModel>(initialViewModel);

  readonly vm$ = this.stateSubject.asObservable();

  search(filters: ClientSearchFilters): void {
    this.patch({ loading: true, error: undefined });

    this.service
      .searchClients(filters)
      .pipe(
        catchError((error: unknown) => {
          this.patch({
            rows: [],
            error: resolveErrorMessage(error, 'Unable to load clients.')
          });

          return of([]);
        }),
        finalize(() => this.patch({ loading: false }))
      )
      .subscribe((rows) => this.patch({ rows }));
  }

  clear(): void {
    this.stateSubject.next(initialViewModel);
  }

  private patch(partial: Partial<ClientSearchViewModel>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial
    });
  }
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

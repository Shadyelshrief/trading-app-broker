import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  buildHistoricalTopSymbolsParams,
  mapHistoricalTopSymbolsResponse
} from './historical-top-symbols.mapper';
import {
  HistoricalTopSymbolRow,
  HistoricalTopSymbolsFilters
} from './historical-top-symbols.models';

@Injectable({ providedIn: 'root' })
export class HistoricalTopSymbolsService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/market/historical-top-symbols`;

  getHistoricalTopSymbols(
    filters: HistoricalTopSymbolsFilters
  ): Observable<HistoricalTopSymbolRow[]> {
    const params = buildHistoricalTopSymbolsParams(filters);

    return this.http
      .get<unknown>(this.base, { params })
      .pipe(map((response) => mapHistoricalTopSymbolsResponse(response)));
    // TODO: Confirm final backend endpoint and response contract with the historical market-data API.
  }
}

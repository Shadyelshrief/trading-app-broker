import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  buildChartDataParams,
  buildComparisonParams,
  mapChartDataResponse,
  mapComparisonChartDataResponse
} from '../charting/charting.mapper';
import type { ChartComparisonDataRequest, ChartDataRequest, ChartPoint, ComparisonSeries } from '../charting/charting.models';

@Injectable({ providedIn: 'root' })
export class ChartDataService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/charts`;

  getSymbolChartData(request: ChartDataRequest): Observable<ChartPoint[]> {
    const instrument = request.instrument;

    return this.http
      .get<unknown>(
        `${this.base}/symbols/${encodeURIComponent(instrument.market)}/${encodeURIComponent(instrument.id)}`,
        { params: buildChartDataParams(request) }
      )
      .pipe(map(mapChartDataResponse));
  }

  getIndexChartData(request: ChartDataRequest): Observable<ChartPoint[]> {
    const instrument = request.instrument;

    return this.http
      .get<unknown>(
        `${this.base}/indices/${encodeURIComponent(instrument.market)}/${encodeURIComponent(instrument.id)}`,
        { params: buildChartDataParams(request) }
      )
      .pipe(map(mapChartDataResponse));
  }

  getComparisonChartData(request: ChartComparisonDataRequest): Observable<ComparisonSeries[]> {
    return this.http
      .get<unknown>(`${this.base}/comparison`, { params: buildComparisonParams(request) })
      .pipe(map((response) => mapComparisonChartDataResponse(response, request.comparisonInstruments)));
  }
}

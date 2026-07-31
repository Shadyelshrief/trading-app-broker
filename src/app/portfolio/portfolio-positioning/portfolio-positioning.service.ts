import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BrokerLookupsService } from '../../shared/lookups/broker-lookups.service';
import type { CashDetailsRow, CashPositionSummary } from '../cash-details/cash-details.models';
import {
  buildCashDetailsParams,
  buildCashPositionParams,
  mapCashDetailsResponse,
  mapCashPositionSummaryResponse,
  mapPortfolioPositioningResponse
} from './portfolio-positioning.mapper';
import type {
  CashDetailsRequest,
  CashPositionRequest,
  ClientOption,
  PortfolioOption,
  PortfolioPositionRow,
  PortfolioPositioningRequest
} from './portfolio-positioning.models';

@Injectable({ providedIn: 'root' })
export class PortfolioPositioningService {
  private readonly http = inject(HttpClient);
  private readonly brokerLookups = inject(BrokerLookupsService);
  private readonly base = `${environment.apiUrl}/portfolio`;

  searchClients(query: string): Observable<ClientOption[]> {
    return this.brokerLookups.searchClients(query);
  }

  getClientPortfolios(clientId: string): Observable<PortfolioOption[]> {
    return this.brokerLookups.getClientPortfolios(clientId);
  }

  getPortfolioPositioning(request: PortfolioPositioningRequest): Observable<PortfolioPositionRow[]> {
    let params = new HttpParams();

    if (request.portfolioId) {
      params = params.set('portfolioId', request.portfolioId);
    }

    return this.http
      .get<unknown>(`${environment.apiUrl}/clients/${encodeURIComponent(request.clientId)}/positions`, { params })
      .pipe(map((response) => mapPortfolioPositioningResponse(response)));
  }

  getCashDetails(request: CashDetailsRequest): Observable<CashDetailsRow[]> {
    return this.http
      .get<unknown>(`${this.base}/cash-details`, { params: buildCashDetailsParams(request) })
      .pipe(map((response) => mapCashDetailsResponse(response)));
  }

  getCashPositionByCurrency(request: CashPositionRequest): Observable<CashPositionSummary> {
    return this.http
      .get<unknown>(`${this.base}/cash-position`, { params: buildCashPositionParams(request) })
      .pipe(map((response) => mapCashPositionSummaryResponse(response, request.currency)));
  }
}

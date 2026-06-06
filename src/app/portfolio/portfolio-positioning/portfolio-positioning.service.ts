import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { CashDetailsRow, CashPositionSummary } from '../cash-details/cash-details.models';
import type { CustodianDetailsRow } from '../custodian-details/custodian-details.models';
import {
  buildCashDetailsParams,
  buildCashPositionParams,
  buildPositioningParams,
  buildSymbolParams,
  mapCashDetailsResponse,
  mapCashPositionSummaryResponse,
  mapClientOptionsResponse,
  mapCustodianDetailsResponse,
  mapPortfolioOptionsResponse,
  mapPortfolioPositioningResponse
} from './portfolio-positioning.mapper';
import type {
  CashDetailsRequest,
  CashPositionRequest,
  ClientOption,
  PortfolioOption,
  PortfolioPositionRow,
  PortfolioPositioningRequest,
  PortfolioSymbolRequest
} from './portfolio-positioning.models';

@Injectable({ providedIn: 'root' })
export class PortfolioPositioningService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/portfolio`;

  searchClients(query: string): Observable<ClientOption[]> {
    return this.http
      .get<unknown>(`${this.base}/clients`, {
        params: new HttpParams().set('query', query)
      })
      .pipe(map((response) => mapClientOptionsResponse(response)));
  }

  getClientPortfolios(clientId: string): Observable<PortfolioOption[]> {
    return this.http
      .get<unknown>(`${this.base}/clients/${encodeURIComponent(clientId)}/portfolios`)
      .pipe(map((response) => mapPortfolioOptionsResponse(response)));
  }

  getPortfolioPositioning(request: PortfolioPositioningRequest): Observable<PortfolioPositionRow[]> {
    return this.http
      .get<unknown>(`${this.base}/positioning`, { params: buildPositioningParams(request) })
      .pipe(map((response) => mapPortfolioPositioningResponse(response)));
  }

  getCustodianDetails(request: PortfolioSymbolRequest): Observable<CustodianDetailsRow[]> {
    return this.http
      .get<unknown>(`${this.base}/custodian-details`, { params: buildSymbolParams(request) })
      .pipe(map((response) => mapCustodianDetailsResponse(response)));
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

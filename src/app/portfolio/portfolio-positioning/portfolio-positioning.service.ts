import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BrokerLookupsService } from '../../shared/lookups/broker-lookups.service';
import { mapPortfolioPositioningResponse } from './portfolio-positioning.mapper';
import type {
  ClientOption,
  PortfolioOption,
  PortfolioPositioningRequest,
  PortfolioPositioningSnapshot
} from './portfolio-positioning.models';

@Injectable({ providedIn: 'root' })
export class PortfolioPositioningService {
  private readonly http = inject(HttpClient);
  private readonly brokerLookups = inject(BrokerLookupsService);

  searchClients(query: string): Observable<ClientOption[]> {
    return this.brokerLookups.searchClients(query);
  }

  getClientPortfolios(clientId: string): Observable<PortfolioOption[]> {
    return this.brokerLookups.getClientPortfolios(clientId);
  }

  getPortfolioPositioning(request: PortfolioPositioningRequest): Observable<PortfolioPositioningSnapshot> {
    let params = new HttpParams();

    if (request.portfolioId) {
      params = params.set('portfolioId', request.portfolioId);
    }

    return this.http
      .get<unknown>(`${environment.apiUrl}/clients/${encodeURIComponent(request.clientId)}/positions`, { params })
      .pipe(map((response) => mapPortfolioPositioningResponse(response)));
  }
}

import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  buildClientSearchParams,
  mapClientSearchResponse
} from '../client-search/client-search.mapper';
import type { ClientSearchFilters, ClientSearchResult } from '../client-search/client-search.models';
import {
  mapCashAccountsResponse,
  mapClientInformationResponse,
  mapClientOptionsResponse,
  mapClientPortfoliosResponse,
  mapDeliveryChannelDetailsResponse,
  mapDeliveryChannelsResponse,
  mapMarketAccountsResponse
} from '../client-information/client-information.mapper';
import type {
  CashAccount,
  ClientInformation,
  ClientPortfolio,
  DeliveryChannel,
  DeliveryChannelDetails,
  MarketAccount
} from '../client-information/client-information.models';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/clients`;

  searchClientOptions(query: string): Observable<ClientSearchResult[]> {
    return this.http
      .get<unknown>(this.base, { params: new HttpParams().set('query', query) })
      .pipe(map(mapClientOptionsResponse));
  }

  searchClients(filters: ClientSearchFilters): Observable<ClientSearchResult[]> {
    return this.http
      .get<unknown>(`${this.base}/search`, { params: buildClientSearchParams(filters) })
      .pipe(map(mapClientSearchResponse));
  }

  getClientInformation(clientId: string): Observable<ClientInformation> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(clientId)}`)
      .pipe(map(mapClientInformationResponse));
  }

  getClientPortfolios(clientId: string): Observable<ClientPortfolio[]> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(clientId)}/portfolios`)
      .pipe(map(mapClientPortfoliosResponse));
  }

  getMarketsAccounts(clientId: string, portfolioId: string): Observable<MarketAccount[]> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(clientId)}/portfolios/${encodeURIComponent(portfolioId)}/markets-accounts`)
      .pipe(map(mapMarketAccountsResponse));
  }

  getCashAccounts(clientId: string, portfolioId: string): Observable<CashAccount[]> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(clientId)}/portfolios/${encodeURIComponent(portfolioId)}/cash-accounts`)
      .pipe(map(mapCashAccountsResponse));
  }

  getDeliveryChannels(clientId: string): Observable<DeliveryChannel[]> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(clientId)}/delivery-channels`)
      .pipe(map(mapDeliveryChannelsResponse));
  }

  getDeliveryChannelDetails(
    clientId: string,
    deliveryChannelId: string,
    loginId: string
  ): Observable<DeliveryChannelDetails> {
    return this.http
      .get<unknown>(
        `${this.base}/${encodeURIComponent(clientId)}/delivery-channels/${encodeURIComponent(deliveryChannelId)}/logins/${encodeURIComponent(loginId)}`
      )
      .pipe(map(mapDeliveryChannelDetailsResponse));
  }
}

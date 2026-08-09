import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { BrokerLookupsService } from '../../shared/lookups/broker-lookups.service';
import type { ClientSearchFilters, ClientSearchResult } from '../client-search/client-search.models';
import {
  mapCashAccountsResponse,
  mapClientInformationResponse,
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
  private readonly brokerLookups = inject(BrokerLookupsService);
  private readonly base = `${environment.apiUrl}/clients`;

  searchClientOptions(query: string): Observable<ClientSearchResult[]> {
    return this.brokerLookups.searchClients(query).pipe(map(toClientSearchResults));
  }

  searchClients(filters: ClientSearchFilters): Observable<ClientSearchResult[]> {
    const query = resolveClientQuery(filters);
    return query ? this.brokerLookups.searchClients(query).pipe(map(toClientSearchResults)) : of([]);
  }

  getClientInformation(clientId: string): Observable<ClientInformation> {
    return this.http
      .get<unknown>(`${this.base}/${encodeURIComponent(clientId)}`)
      .pipe(map(mapClientInformationResponse));
  }

  getClientPortfolios(clientId: string): Observable<ClientPortfolio[]> {
    return this.brokerLookups.getClientPortfolios(clientId).pipe(
      map((portfolios) =>
        portfolios.map((portfolio) => ({
          portfolio: portfolio.portfolioName,
          portfolioId: portfolio.portfolioId,
          custodyType: portfolio.type ?? '',
          marketsAccounts: [],
          cashAccounts: []
        }))
      )
    );
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

function toClientSearchResults(clients: Array<{ clientId: string; clientName: string; friendlyId?: string }>): ClientSearchResult[] {
  return clients.map((client) => ({
    clientId: client.clientId,
    clientName: client.clientName,
    friendlyId: client.friendlyId
  }));
}

function resolveClientQuery(filters: ClientSearchFilters): string {
  for (const value of [
    filters.clientId,
    filters.clientName,
    filters.idNumber,
    filters.mobile,
    filters.telephone,
    filters.email
  ]) {
    const query = value?.trim();

    if (query) {
      return query;
    }
  }

  return '';
}

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface LookupOption {
  label: string;
  value: string;
}

export interface MarketLookupOption extends LookupOption {
  id?: string;
  code: string;
  timezone?: string;
}

export interface SectorLookupOption extends LookupOption {
  id?: string;
}

export interface ProductLookupOption extends LookupOption {
  id?: string;
  symbol: string;
  marketCode: string;
}

interface ApiResponse<T> {
  body?: T;
}

interface MarketDto {
  id?: string;
  name?: string;
  code?: string;
  timezone?: string;
}

interface SectorDto {
  id?: string;
  name?: string;
}

interface ProductDto {
  id?: string;
  name?: string;
  symbol?: string;
}

@Injectable({ providedIn: 'root' })
export class ReferenceDataLookupsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly markets$ = this.http.get<ApiResponse<MarketDto[]>>(`${this.base}/markets`).pipe(
    map((response) => (response.body ?? []).map(mapMarket).filter((option): option is MarketLookupOption => option !== null)),
    catchError(() => of([] as MarketLookupOption[])),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getMarkets(): Observable<MarketLookupOption[]> {
    return this.markets$;
  }

  getSectorsByMarket(marketCode: string): Observable<SectorLookupOption[]> {
    const code = marketCode.trim().toUpperCase();

    if (!code || code.toLowerCase() === 'all') {
      return of([]);
    }

    return this.http.get<ApiResponse<SectorDto[]>>(`${this.base}/markets/${encodeURIComponent(code)}/sectors`).pipe(
      map((response) => (response.body ?? []).map(mapSector).filter((option): option is SectorLookupOption => option !== null)),
      catchError(() => of([] as SectorLookupOption[]))
    );
  }

  getProductsByMarket(marketCode: string): Observable<ProductLookupOption[]> {
    const code = marketCode.trim().toUpperCase();

    if (!code || code.toLowerCase() === 'all') {
      return of([]);
    }

    return this.http.get<ApiResponse<ProductDto[]>>(`${this.base}/markets/${encodeURIComponent(code)}/products`).pipe(
      map((response) => (response.body ?? []).map((product) => mapProduct(product, code)).filter((option): option is ProductLookupOption => option !== null)),
      catchError(() => of([] as ProductLookupOption[]))
    );
  }
}

function mapMarket(market: MarketDto): MarketLookupOption | null {
  const code = market.code?.trim();

  if (!code) {
    return null;
  }

  return {
    id: market.id,
    code,
    value: code.toLowerCase(),
    label: code,
    timezone: market.timezone
  };
}

function mapSector(sector: SectorDto): SectorLookupOption | null {
  const name = sector.name?.trim();

  if (!name) {
    return null;
  }

  return {
    id: sector.id,
    value: name,
    label: name
  };
}

function mapProduct(product: ProductDto, marketCode: string): ProductLookupOption | null {
  const symbol = product.symbol?.trim();

  if (!symbol) {
    return null;
  }

  return {
    id: product.id,
    symbol,
    marketCode,
    value: symbol,
    label: product.name ? `${symbol} - ${product.name}` : symbol
  };
}

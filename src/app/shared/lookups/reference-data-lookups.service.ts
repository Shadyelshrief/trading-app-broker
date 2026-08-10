import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, shareReplay, switchMap } from 'rxjs';

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
  name?: string;
  sector?: string;
  status?: string;
  currency?: string;
}

interface ApiResponse<T> {
  body?: T;
}

interface PaginatedApiResponse<T> {
  body?: { data?: T[] };
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
  sector?: string | { name?: string };
  sectorName?: string;
  status?: string;
  currency?: string;
}

interface LanguageDto {
  id?: string;
  languageId?: string;
  isDefault?: boolean;
  default?: boolean;
}

const DEFAULT_LANGUAGE_ID = '';

@Injectable({ providedIn: 'root' })
export class ReferenceDataLookupsService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl;
  private readonly sectorsByMarket = new Map<string, Observable<SectorLookupOption[]>>();
  private readonly assetsByMarket = new Map<string, Observable<ProductLookupOption[]>>();
  private readonly languageId$ = this.http.get<ApiResponse<LanguageDto[]>>(`${this.base}/languages`).pipe(
    map((response) => resolveLanguageId(response.body ?? [])),
    catchError(() => of(DEFAULT_LANGUAGE_ID)),
    shareReplay({ bufferSize: 1, refCount: false })
  );
  private readonly markets$ = this.languageId$.pipe(
    switchMap((languageId) =>
      this.http.get<ApiResponse<MarketDto[]>>(`${this.base}/markets`, { params: languageParams(languageId) })
    ),
    map((response) => (response.body ?? []).map(mapMarket).filter((option): option is MarketLookupOption => option !== null)),
    catchError(() => of([] as MarketLookupOption[])),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  getMarkets(): Observable<MarketLookupOption[]> {
    return this.markets$;
  }

  getLanguageId(): Observable<string> {
    return this.languageId$;
  }

  getSectorsByMarket(marketCode: string): Observable<SectorLookupOption[]> {
    const code = marketCode.trim().toUpperCase();

    if (!code || code.toLowerCase() === 'all') {
      return of([]);
    }

    if (!this.sectorsByMarket.has(code)) {
      this.sectorsByMarket.set(
        code,
        this.languageId$.pipe(
          switchMap((languageId) =>
            this.http.get<ApiResponse<SectorDto[]>>(`${this.base}/markets/${encodeURIComponent(code)}/sectors`, { params: languageParams(languageId) })
          ),
          map((response) => (response.body ?? []).map(mapSector).filter((option): option is SectorLookupOption => option !== null)),
          catchError(() => of([] as SectorLookupOption[])),
          shareReplay({ bufferSize: 1, refCount: false })
        )
      );
    }

    return this.sectorsByMarket.get(code) ?? of([]);
  }

  getAssetsByMarket(marketCode: string): Observable<ProductLookupOption[]> {
    const code = marketCode.trim().toUpperCase();

    if (!code || code === 'ALL') {
      return of([]);
    }

    if (!this.assetsByMarket.has(code)) {
      this.assetsByMarket.set(
        code,
        this.http
          .get<ApiResponse<ProductDto[]>>(`${this.base}/markets/${encodeURIComponent(code)}/assets`)
          .pipe(
            map((response) =>
              (response.body ?? [])
                .map((asset) => mapProduct(asset, code))
                .filter((option): option is ProductLookupOption => option !== null)
            ),
            catchError(() => of([] as ProductLookupOption[])),
            shareReplay({ bufferSize: 1, refCount: false })
          )
      );
    }

    return this.assetsByMarket.get(code) ?? of([]);
  }

  searchAssets(query: string, marketCode?: string): Observable<ProductLookupOption[]> {
    const q = query.trim();
    const code = marketCode?.trim().toUpperCase();

    if (!q) {
      return of([]);
    }

    if (code && code !== 'ALL') {
      return this.searchAssetsByMarket(code, q);
    }

    return this.markets$.pipe(
      switchMap((markets) =>
        markets.length
          ? forkJoin(markets.map((market) => this.searchAssetsByMarket(market.code, q)))
          : of([] as ProductLookupOption[][])
      ),
      map((groups) => groups.flat().slice(0, 20))
    );
  }

  private searchAssetsByMarket(marketCode: string, query: string): Observable<ProductLookupOption[]> {
    const params = new HttpParams().set('q', query).set('page', '1').set('size', '20');

    return this.http
      .get<PaginatedApiResponse<ProductDto>>(`${this.base}/markets/${encodeURIComponent(marketCode)}/assets/search`, { params })
      .pipe(
        map((response) => (response.body?.data ?? []).map((asset) => mapProduct(asset, marketCode)).filter((option): option is ProductLookupOption => option !== null)),
        catchError(() => of([] as ProductLookupOption[]))
      );
  }
}

function resolveLanguageId(languages: LanguageDto[]): string {
  const language = languages.find((item) => item.isDefault || item.default) ?? languages[0];
  return language?.languageId ?? language?.id ?? DEFAULT_LANGUAGE_ID;
}

function languageParams(languageId: string): HttpParams {
  return languageId ? new HttpParams().set('languageId', languageId) : new HttpParams();
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

  const name = product.name?.trim();
  const sector =
    product.sectorName?.trim() ??
    (typeof product.sector === 'string' ? product.sector.trim() : product.sector?.name?.trim());

  return {
    id: product.id,
    symbol,
    marketCode,
    value: symbol,
    label: name ? `${symbol} - ${name}` : symbol,
    name,
    sector,
    status: product.status?.trim(),
    currency: product.currency?.trim()
  };
}

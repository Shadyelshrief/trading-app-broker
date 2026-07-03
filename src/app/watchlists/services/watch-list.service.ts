import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { ReferenceDataLookupsService } from '../../shared/lookups/reference-data-lookups.service';
import { findSharedSymbolOption } from '../../shared/utils/symbol-reference.util';
import { SymbolOption, WatchListConfig } from '../saved-watch-list/saved-watch-list.models';
import { WatchListStorageService } from './watch-list-storage.service';

interface ApiResponse<T> {
  body?: T;
}

interface WatchlistDto {
  id?: string;
  name?: string;
}

interface WatchlistDetailsDto extends WatchlistDto {
  items?: ProductDto[];
}

interface ProductDto {
  id?: string;
  name?: string;
  symbol?: string;
  currency?: string;
  market?: string;
  marketCode?: string;
  marketShortName?: string;
  exchange?: string;
}

@Injectable({ providedIn: 'root' })
export class WatchListService {
  private readonly http = inject(HttpClient);
  private readonly reference = inject(ReferenceDataLookupsService);
  private readonly metadata = inject(WatchListStorageService);
  private readonly base = `${environment.apiUrl}/watchlists`;
  private readonly refreshSubject = new BehaviorSubject(0);

  getWatchLists(): Observable<WatchListConfig[]> {
    return this.refreshSubject.pipe(
      switchMap(() =>
        this.http.get<ApiResponse<WatchlistDto[]>>(this.base).pipe(
          switchMap((response) => {
            const lists = response.body ?? [];

            if (lists.length === 0) {
              return of([]);
            }

            return forkJoin(
              lists.map((list) =>
                list.id
                  ? this.getWatchList(list.id).pipe(map((config) => config ?? mapSummary(list)), catchError(() => of(mapSummary(list))))
                  : of(mapSummary(list))
              )
            );
          }),
          map((lists) => lists.sort((left, right) => right.updatedAt - left.updatedAt))
        )
      )
    );
  }

  getWatchList(id: string): Observable<WatchListConfig | null> {
    return this.http.get<ApiResponse<WatchlistDetailsDto>>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      map((response) => {
        const details = response.body;
        return details?.id ? mergeCachedMetadata(mapDetails(details), this.metadata.getSnapshot()) : null;
      })
    );
  }

  createWatchList(config: WatchListConfig): Observable<WatchListConfig> {
    return this.http.post<ApiResponse<WatchlistDto>>(this.base, { name: config.name }).pipe(
      switchMap((response) => {
        const created = response.body;

        if (!created?.id) {
          throw new Error('Watchlist create response is missing id.');
        }

        const id = created.id;
        const nextConfig = { ...config, id, name: created.name ?? config.name, createdAt: Date.now(), updatedAt: Date.now() };

        return this.syncItems(id, [], config.selectedSymbols ?? []).pipe(
          switchMap(() => this.getWatchList(id)),
          map((saved) => saved ?? nextConfig),
          tap((saved) => {
            this.saveMetadata(saved, nextConfig);
            this.refresh();
          })
        );
      })
    );
  }

  updateWatchList(config: WatchListConfig): Observable<WatchListConfig> {
    return this.getWatchList(config.id).pipe(
      switchMap((current) => {
        if (!current || current.name !== config.name) {
          return this.createWatchList(config).pipe(
            switchMap((created) => this.deleteWatchList(config.id).pipe(catchError(() => of(undefined)), map(() => created)))
          );
        }

        return this.syncItems(config.id, current.selectedSymbols ?? [], config.selectedSymbols ?? []).pipe(
          switchMap(() => this.getWatchList(config.id)),
          map((saved) => saved ?? config),
          tap((saved) => {
            this.saveMetadata(saved, config);
            this.refresh();
          })
        );
      })
    );
  }

  deleteWatchList(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}`).pipe(
      tap(() => {
        this.metadata.saveAll(this.metadata.getSnapshot().filter((list) => list.id !== id));
        this.refresh();
      }),
      map(() => undefined)
    );
  }

  private syncItems(id: string, currentSymbols: readonly SymbolOption[], nextSymbols: readonly SymbolOption[]): Observable<void> {
    return this.resolveAssetSymbols(nextSymbols).pipe(
      switchMap((nextWithAssets) => {
        const currentIds = new Set(currentSymbols.map((symbol) => symbol.assetId).filter((assetId): assetId is string => !!assetId));
        const nextIds = new Set(nextWithAssets.map((symbol) => symbol.assetId).filter((assetId): assetId is string => !!assetId));
        const adds = [...nextIds].filter((assetId) => !currentIds.has(assetId));
        const removes = [...currentIds].filter((assetId) => !nextIds.has(assetId));
        const requests = [
          ...adds.map((assetId) => this.http.post<void>(`${this.base}/${encodeURIComponent(id)}/items`, { assetId })),
          ...removes.map((assetId) => this.http.delete<void>(`${this.base}/${encodeURIComponent(id)}/items/${encodeURIComponent(assetId)}`))
        ];

        return requests.length ? forkJoin(requests).pipe(map(() => undefined)) : of(undefined);
      })
    );
  }

  private resolveAssetSymbols(symbols: readonly SymbolOption[]): Observable<SymbolOption[]> {
    const unresolved = symbols.filter((symbol) => !symbol.assetId);
    const markets = [...new Set(unresolved.map((symbol) => symbol.marketShortName).filter(Boolean))];

    if (markets.length === 0) {
      return of([...symbols]);
    }

    return forkJoin(markets.map((market) => this.reference.getProductsByMarket(market).pipe(catchError(() => of([]))))).pipe(
      map((groups) => {
        const lookup = new Map(groups.flat().map((product) => [`${product.marketCode}:${product.symbol}`.toUpperCase(), product.id]));
        return symbols.map((symbol) => ({
          ...symbol,
          assetId: symbol.assetId ?? lookup.get(`${symbol.marketShortName}:${symbol.symbolId}`.toUpperCase())
        }));
      })
    );
  }

  private saveMetadata(saved: WatchListConfig, requested: WatchListConfig): void {
    const next = {
      ...requested,
      id: saved.id,
      name: saved.name,
      selectedSymbols: saved.selectedSymbols?.length ? saved.selectedSymbols : requested.selectedSymbols,
      createdAt: saved.createdAt,
      updatedAt: Date.now()
    };
    const remaining = this.metadata.getSnapshot().filter((list) => list.id !== next.id);
    this.metadata.saveAll([...remaining, next]);
  }

  private refresh(): void {
    this.refreshSubject.next(Date.now());
  }
}

function mapSummary(dto: WatchlistDto): WatchListConfig {
  const now = Date.now();
  return {
    id: dto.id ?? crypto.randomUUID(),
    name: dto.name ?? 'Watch List',
    sourceType: 'SELECTED_SYMBOLS',
    selectedSymbols: [],
    conditions: [],
    createdAt: now,
    updatedAt: now
  };
}

function mapDetails(dto: WatchlistDetailsDto): WatchListConfig {
  const now = Date.now();
  return {
    ...mapSummary(dto),
    selectedSymbols: (dto.items ?? []).map(mapProduct).filter((symbol): symbol is SymbolOption => symbol !== null),
    createdAt: now,
    updatedAt: now
  };
}

function mapProduct(product: ProductDto): SymbolOption | null {
  const symbolId = product.symbol?.trim();

  if (!symbolId) {
    return null;
  }

  const reference = findSharedSymbolOption(symbolId);
  const market = product.marketShortName ?? product.marketCode ?? product.exchange ?? product.market ?? reference?.market ?? '';

  return {
    assetId: product.id,
    symbolId,
    symbolName: product.name?.trim() || reference?.symbolName || symbolId,
    market,
    marketShortName: market,
    currency: product.currency ?? reference?.currency ?? ''
  };
}

function mergeCachedMetadata(config: WatchListConfig, cachedLists: readonly WatchListConfig[]): WatchListConfig {
  const cached = cachedLists.find((list) => list.id === config.id);

  if (!cached) {
    return config;
  }

  return {
    ...cached,
    name: config.name,
    selectedSymbols: (config.selectedSymbols?.length ?? 0) > 0 ? config.selectedSymbols : cached.selectedSymbols,
    updatedAt: config.updatedAt
  };
}

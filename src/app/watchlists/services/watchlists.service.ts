import { Injectable } from '@angular/core';

const STORAGE_KEY = 'broker-watchlist-default-v1';

@Injectable({ providedIn: 'root' })
export class WatchlistsService {
  getDefaultSymbols(): string[] {
    const raw = localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return ['IHC', 'FAB', 'ADNOCDIST', 'ALDAR'];
    }

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
    } catch {
      return ['IHC', 'FAB', 'ADNOCDIST', 'ALDAR'];
    }
  }

  saveDefaultSymbols(symbols: string[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(symbols));
  }
}

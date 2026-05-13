import { Injectable } from '@angular/core';
import { Observable, concat, defer, interval, map, of } from 'rxjs';

import { WatchlistMarketEvent, WatchlistQuote } from '../../shared/models/watchlist-quote.model';

@Injectable({ providedIn: 'root' })
export class MockMarketService {
  watchlist$(): Observable<WatchlistMarketEvent> {
    return defer(() => {
      let rows = this.createSeedRows();

      return concat(
        of<WatchlistMarketEvent>({
          type: 'snapshot',
          rows
        }),
        interval(850).pipe(
          map(() => {
            rows = this.applyTick(rows);
            const updatedRow = rows[this.lastUpdatedIndex];

            return {
              type: 'update',
              rows: [updatedRow]
            } satisfies WatchlistMarketEvent;
          })
        )
      );
    });
  }

  private lastUpdatedIndex = 0;

  private createSeedRows(): WatchlistQuote[] {
    const seed = [
      { symbol: 'AAPL', lastPrice: 214.38, previousClose: 212.96, volume: 28400000 },
      { symbol: 'MSFT', lastPrice: 428.26, previousClose: 425.61, volume: 18100000 },
      { symbol: 'NVDA', lastPrice: 131.72, previousClose: 129.04, volume: 42700000 },
      { symbol: 'TSLA', lastPrice: 177.41, previousClose: 179.09, volume: 56300000 },
      { symbol: 'META', lastPrice: 501.16, previousClose: 499.11, volume: 11800000 }
    ];

    return seed.map((row) => this.toQuote(row.symbol, row.lastPrice, row.previousClose, row.volume, 'flat'));
  }

  private applyTick(currentRows: WatchlistQuote[]): WatchlistQuote[] {
    const nextRows = [...currentRows];
    const index = Math.floor(Math.random() * nextRows.length);
    const current = nextRows[index];
    const delta = this.roundTo(2, (Math.random() - 0.48) * Math.max(0.18, current.lastPrice * 0.003));
    const nextPrice = this.roundTo(2, Math.max(1, current.lastPrice + delta));
    const nextVolume = current.volume + Math.floor(8000 + Math.random() * 120000);
    const direction = nextPrice > current.lastPrice ? 'up' : nextPrice < current.lastPrice ? 'down' : 'flat';

    nextRows[index] = this.toQuote(
      current.symbol,
      nextPrice,
      current.previousClose,
      nextVolume,
      direction
    );

    this.lastUpdatedIndex = index;

    return nextRows;
  }

  private toQuote(
    symbol: string,
    lastPrice: number,
    previousClose: number,
    volume: number,
    direction: WatchlistQuote['direction']
  ): WatchlistQuote {
    const change = this.roundTo(2, lastPrice - previousClose);
    const changePercent = this.roundTo(2, (change / previousClose) * 100);

    return {
      symbol,
      lastPrice,
      change,
      changePercent,
      volume,
      previousClose,
      direction
    };
  }

  private roundTo(precision: number, value: number): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }
}

import { Injectable } from '@angular/core';
import { Observable, defer, interval, map, startWith } from 'rxjs';

import { MarketDepthRow } from '../../shared/models/market-depth-row.model';

@Injectable({ providedIn: 'root' })
export class MockMarketDepthService {
  depth$(): Observable<MarketDepthRow[]> {
    return defer(() => {
      let rows = this.createDepthRows();

      return interval(500).pipe(
        startWith(0),
        map(() => {
          rows = this.mutateDepth(rows);
          return rows;
        })
      );
    });
  }

  private createDepthRows(): MarketDepthRow[] {
    const baseMid = 194.25;

    return Array.from({ length: 10 }, (_, index) => {
      const step = index + 1;
      const bidPrice = this.roundTo(2, baseMid - step * 0.01);
      const askPrice = this.roundTo(2, baseMid + step * 0.01);

      return {
        level: step,
        bidQty: 800 + step * 170,
        bidPrice,
        askPrice,
        askQty: 760 + step * 160
      };
    });
  }

  private mutateDepth(currentRows: MarketDepthRow[]): MarketDepthRow[] {
    const topBid = currentRows[0].bidPrice;
    const topAsk = currentRows[0].askPrice;
    const mid = (topBid + topAsk) / 2;
    const microShift = (Math.random() - 0.5) * 0.01;

    return currentRows.map((row, index) => {
      const level = index + 1;
      const bidPrice = this.roundTo(2, mid - level * 0.01 + microShift);
      const askPrice = this.roundTo(2, mid + level * 0.01 + microShift);
      const bidQty = Math.max(100, row.bidQty + Math.round((Math.random() - 0.5) * 220));
      const askQty = Math.max(100, row.askQty + Math.round((Math.random() - 0.5) * 220));

      return {
        level,
        bidQty,
        bidPrice,
        askPrice,
        askQty
      };
    });
  }

  private roundTo(precision: number, value: number): number {
    const factor = 10 ** precision;
    return Math.round(value * factor) / factor;
  }
}

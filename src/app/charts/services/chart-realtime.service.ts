import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MarketDataService, buildTickTopic, normalizeTopic } from '../../core/market-data';
import { mapTickToChartPoint } from '../charting/charting.mapper';
import type { ChartInstrument, ChartPoint } from '../charting/charting.models';

@Injectable({ providedIn: 'root' })
export class ChartRealtimeService {
  private readonly marketData = inject(MarketDataService);

  observeInstrument(instrument: ChartInstrument): Observable<ChartPoint | null> {
    return this.marketData
      .observe<unknown>(this.buildTopic(instrument))
      .pipe(map((payload) => mapTickToChartPoint(payload)));
  }

  buildTopic(instrument: ChartInstrument): string {
    if (instrument.type === 'INDEX') {
      return normalizeTopic(`market:${instrument.market}:index:${instrument.id}`);
    }

    return buildTickTopic(instrument.market, instrument.id);
  }
}

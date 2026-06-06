import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import type { ChartSeriesPoint, PerformanceRequest } from './market-performance.service';
import { MarketPerformanceService } from './market-performance.service';
import { IndicatorCalculatorService } from '../technical-indicators/indicator-calculator.service';
import type { TechnicalIndicatorConfig, TechnicalIndicatorSeries } from '../technical-indicators/indicator.models';

@Injectable({ providedIn: 'root' })
export class TechnicalIndicatorsService {
  private readonly marketPerformance = inject(MarketPerformanceService);
  private readonly calculator = inject(IndicatorCalculatorService);

  getTechnicalIndicatorData(
    request: PerformanceRequest,
    indicators: readonly TechnicalIndicatorConfig[]
  ): Observable<TechnicalIndicatorSeries[]> {
    return this.marketPerformance.getTechnicalIndicatorData({
      ...request,
      indicators: [...indicators]
    });
  }

  calculateFromHistory(
    points: readonly ChartSeriesPoint[],
    indicators: readonly TechnicalIndicatorConfig[]
  ): TechnicalIndicatorSeries[] {
    return this.calculator.calculate(points, indicators);
  }
}

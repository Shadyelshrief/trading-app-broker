import { Injectable } from '@angular/core';

import type { ChartSeriesPoint } from '../services/market-performance.service';
import type { TechnicalIndicatorConfig, TechnicalIndicatorSeries } from './indicator.models';

@Injectable({ providedIn: 'root' })
export class IndicatorCalculatorService {
  calculate(points: readonly ChartSeriesPoint[], indicators: readonly TechnicalIndicatorConfig[]): TechnicalIndicatorSeries[] {
    return indicators.flatMap((indicator) => this.calculateOne(points, indicator));
  }

  private calculateOne(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries[] {
    switch (indicator.type) {
      case 'SMA':
        return [this.averageSeries(points, indicator, false)];
      case 'EMA':
        return [this.averageSeries(points, indicator, true)];
      case 'RSI':
        return [this.rsi(points, indicator)];
      case 'MACD':
        return this.macd(points, indicator);
      case 'BOLLINGER_BANDS':
        return this.bollinger(points, indicator);
      case 'VOLUME':
        return [this.volume(points, indicator)];
      case 'ROC':
        return [this.rateOfChange(points, indicator)];
      case 'MOMENTUM':
        return [this.momentum(points, indicator)];
    }
  }

  private averageSeries(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig, exponential: boolean): TechnicalIndicatorSeries {
    const period = readNumber(indicator.params['period'], 14);
    const values = points.map(closeValue);
    const output: ChartSeriesPoint[] = [];
    let ema = values[0] ?? 0;
    const multiplier = 2 / (period + 1);

    for (let index = 0; index < points.length; index++) {
      if (exponential) {
        ema = index === 0 ? values[index] : (values[index] - ema) * multiplier + ema;
        output.push({ date: points[index].date, time: points[index].time ?? points[index].date, value: round(ema) });
      } else if (index >= period - 1) {
        const slice = values.slice(index - period + 1, index + 1);
        output.push({ date: points[index].date, time: points[index].time ?? points[index].date, value: round(mean(slice)) });
      }
    }

    return this.toSeries(indicator, output);
  }

  private rsi(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries {
    const period = readNumber(indicator.params['period'], 14);
    const values = points.map(closeValue);
    const output: ChartSeriesPoint[] = [];

    for (let index = period; index < values.length; index++) {
      const changes = values.slice(index - period + 1, index + 1).map((value, offset, slice) => value - (slice[offset - 1] ?? value));
      const gains = changes.filter((change) => change > 0);
      const losses = changes.filter((change) => change < 0).map(Math.abs);
      const averageGain = gains.length ? mean(gains) : 0;
      const averageLoss = losses.length ? mean(losses) : 0;
      const value = averageLoss === 0 ? 100 : 100 - 100 / (1 + averageGain / averageLoss);

      output.push({ date: points[index].date, time: points[index].time ?? points[index].date, value: round(value) });
    }

    return this.toSeries(indicator, output);
  }

  private macd(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries[] {
    const fast = readNumber(indicator.params['fastPeriod'], 12);
    const slow = readNumber(indicator.params['slowPeriod'], 26);
    const signalPeriod = readNumber(indicator.params['signalPeriod'], 9);
    const values = points.map(closeValue);
    const fastEma = emaValues(values, fast);
    const slowEma = emaValues(values, slow);
    const macdValues = values.map((_, index) => fastEma[index] - slowEma[index]);
    const signalValues = emaValues(macdValues, signalPeriod);

    return [
      this.toSeries(indicator, points.map((point, index) => ({ date: point.date, time: point.time ?? point.date, value: round(macdValues[index]) }))),
      this.toSeries(
        { ...indicator, id: `${indicator.id}-signal`, label: `${indicator.label} Signal`, color: '#f6c55b' },
        points.map((point, index) => ({ date: point.date, time: point.time ?? point.date, value: round(signalValues[index]) }))
      )
    ];
  }

  private bollinger(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries[] {
    const period = readNumber(indicator.params['period'], 20);
    const deviation = readNumber(indicator.params['standardDeviation'], 2);
    const values = points.map(closeValue);
    const upper: ChartSeriesPoint[] = [];
    const middle: ChartSeriesPoint[] = [];
    const lower: ChartSeriesPoint[] = [];

    for (let index = period - 1; index < values.length; index++) {
      const slice = values.slice(index - period + 1, index + 1);
      const avg = mean(slice);
      const sd = standardDeviation(slice);
      const point = points[index];
      middle.push({ date: point.date, time: point.time ?? point.date, value: round(avg) });
      upper.push({ date: point.date, time: point.time ?? point.date, value: round(avg + sd * deviation) });
      lower.push({ date: point.date, time: point.time ?? point.date, value: round(avg - sd * deviation) });
    }

    return [
      this.toSeries({ ...indicator, id: `${indicator.id}-upper`, label: `${indicator.label} Upper` }, upper),
      this.toSeries({ ...indicator, id: `${indicator.id}-middle`, label: `${indicator.label} Mid`, color: '#60a5fa' }, middle),
      this.toSeries({ ...indicator, id: `${indicator.id}-lower`, label: `${indicator.label} Lower` }, lower)
    ];
  }

  private volume(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries {
    return this.toSeries(
      indicator,
      points.map((point) => ({
        date: point.date,
        time: point.time ?? point.date,
        value: point.volume ?? 0,
        volume: point.volume ?? 0
      }))
    );
  }

  private rateOfChange(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries {
    const period = readNumber(indicator.params['period'], 12);
    const values = points.map(closeValue);
    const output = values.slice(period).map((value, index) => {
      const previous = values[index];
      const point = points[index + period];
      return {
        date: point.date,
        time: point.time ?? point.date,
        value: previous === 0 ? 0 : round(((value - previous) / previous) * 100)
      };
    });

    return this.toSeries(indicator, output);
  }

  private momentum(points: readonly ChartSeriesPoint[], indicator: TechnicalIndicatorConfig): TechnicalIndicatorSeries {
    const period = readNumber(indicator.params['period'], 10);
    const values = points.map(closeValue);
    const output = values.slice(period).map((value, index) => {
      const point = points[index + period];
      return {
        date: point.date,
        time: point.time ?? point.date,
        value: round(value - values[index])
      };
    });

    return this.toSeries(indicator, output);
  }

  private toSeries(indicator: TechnicalIndicatorConfig, points: ChartSeriesPoint[]): TechnicalIndicatorSeries {
    return {
      id: indicator.id,
      indicatorId: indicator.id,
      label: indicator.label,
      points,
      color: indicator.color,
      panel: indicator.panel
    };
  }
}

function closeValue(point: ChartSeriesPoint): number {
  return point.close ?? point.value ?? 0;
}

function readNumber(value: number | string | undefined, fallback: number): number {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function standardDeviation(values: readonly number[]): number {
  const avg = mean(values);
  return Math.sqrt(mean(values.map((value) => (value - avg) ** 2)));
}

function emaValues(values: readonly number[], period: number): number[] {
  const multiplier = 2 / (period + 1);
  const output: number[] = [];
  let ema = values[0] ?? 0;

  for (let index = 0; index < values.length; index++) {
    ema = index === 0 ? values[index] : (values[index] - ema) * multiplier + ema;
    output.push(ema);
  }

  return output;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

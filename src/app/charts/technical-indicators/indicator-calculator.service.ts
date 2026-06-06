import { Injectable } from '@angular/core';

import type { MarketChartSeries } from '../../shared/models/market-chart.model';
import type { ChartPoint, TechnicalIndicatorConfig } from '../charting/charting.models';

@Injectable({ providedIn: 'root' })
export class IndicatorCalculatorService {
  calculateSeries(data: readonly ChartPoint[], indicators: readonly TechnicalIndicatorConfig[]): MarketChartSeries[] {
    return indicators.flatMap((indicator) => this.calculateIndicator(data, indicator));
  }

  private calculateIndicator(data: readonly ChartPoint[], indicator: TechnicalIndicatorConfig): MarketChartSeries[] {
    switch (indicator.type) {
      case 'SMA':
        return [lineSeries(indicator, movingAverage(values(data, source(indicator)), period(indicator)), data)];
      case 'EMA':
        return [lineSeries(indicator, exponentialMovingAverage(values(data, source(indicator)), period(indicator)), data)];
      case 'RSI':
        return [lineSeries(indicator, rsi(values(data, source(indicator)), period(indicator)), data, 'rsi')];
      case 'MACD':
        return macdSeries(data, indicator);
      case 'BOLLINGER_BANDS':
        return bollingerSeries(data, indicator);
      case 'MOMENTUM':
        return [lineSeries(indicator, momentum(values(data, source(indicator)), period(indicator)), data, 'momentum')];
      case 'ROC':
        return [lineSeries(indicator, roc(values(data, source(indicator)), period(indicator)), data, 'roc')];
      case 'VOLUME':
        return [
          {
            id: indicator.id,
            label: indicator.label,
            points: data.map((point) => ({ time: point.time, volume: point.volume ?? 0 })),
            type: 'bar',
            yKey: 'volume',
            yAxisKey: 'volume',
            color: indicator.color
          }
        ];
    }
  }
}

function lineSeries(
  indicator: TechnicalIndicatorConfig,
  indicatorValues: readonly (number | null)[],
  data: readonly ChartPoint[],
  key = indicator.type.toLowerCase()
): MarketChartSeries {
  return {
    id: indicator.id,
    label: indicator.label,
    points: data.map((point, index) => ({
      time: point.time,
      [key]: indicatorValues[index] ?? undefined
    })),
    type: 'line',
    yKey: key,
    color: indicator.color
  };
}

function macdSeries(data: readonly ChartPoint[], indicator: TechnicalIndicatorConfig): MarketChartSeries[] {
  const close = values(data, 'close');
  const fast = exponentialMovingAverage(close, param(indicator, 'fastPeriod', 12));
  const slow = exponentialMovingAverage(close, param(indicator, 'slowPeriod', 26));
  const macd = fast.map((value, index) => value !== null && slow[index] !== null ? value - slow[index]! : null);
  const signal = exponentialMovingAverage(macd.map((value) => value ?? 0), param(indicator, 'signalPeriod', 9));

  return [
    lineSeries({ ...indicator, label: `${indicator.label} Line` }, macd, data, 'macd'),
    lineSeries({ ...indicator, id: `${indicator.id}-signal`, label: `${indicator.label} Signal`, color: '#f6c55b' }, signal, data, 'signal')
  ];
}

function bollingerSeries(data: readonly ChartPoint[], indicator: TechnicalIndicatorConfig): MarketChartSeries[] {
  const input = values(data, source(indicator));
  const size = period(indicator, 20);
  const deviation = param(indicator, 'standardDeviation', 2);
  const middle = movingAverage(input, size);
  const upper: Array<number | null> = [];
  const lower: Array<number | null> = [];

  input.forEach((_value, index) => {
    if (index + 1 < size) {
      upper.push(null);
      lower.push(null);
      return;
    }

    const window = input.slice(index + 1 - size, index + 1);
    const average = middle[index] ?? 0;
    const variance = window.reduce((total, value) => total + Math.pow(value - average, 2), 0) / size;
    const band = Math.sqrt(variance) * deviation;

    upper.push(average + band);
    lower.push(average - band);
  });

  return [
    lineSeries({ ...indicator, label: `${indicator.label} Mid` }, middle, data, 'bb_mid'),
    lineSeries({ ...indicator, id: `${indicator.id}-upper`, label: `${indicator.label} Upper`, color: '#f97316' }, upper, data, 'bb_upper'),
    lineSeries({ ...indicator, id: `${indicator.id}-lower`, label: `${indicator.label} Lower`, color: '#f97316' }, lower, data, 'bb_lower')
  ];
}

function movingAverage(input: readonly number[], size: number): Array<number | null> {
  return input.map((_value, index) => {
    if (index + 1 < size) {
      return null;
    }

    const window = input.slice(index + 1 - size, index + 1);
    return window.reduce((total, item) => total + item, 0) / size;
  });
}

function exponentialMovingAverage(input: readonly number[], size: number): Array<number | null> {
  const multiplier = 2 / (size + 1);
  let previous: number | null = null;

  return input.map((value, index) => {
    if (index + 1 < size) {
      return null;
    }

    if (previous === null) {
      previous = input.slice(index + 1 - size, index + 1).reduce((total, item) => total + item, 0) / size;
      return previous;
    }

    previous = (value - previous) * multiplier + previous;
    return previous;
  });
}

function rsi(input: readonly number[], size: number): Array<number | null> {
  return input.map((_value, index) => {
    if (index < size) {
      return null;
    }

    let gains = 0;
    let losses = 0;

    for (let pointer = index - size + 1; pointer <= index; pointer += 1) {
      const change = input[pointer] - input[pointer - 1];
      if (change >= 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }

    if (losses === 0) {
      return 100;
    }

    const relativeStrength = gains / losses;
    return 100 - 100 / (1 + relativeStrength);
  });
}

function momentum(input: readonly number[], size: number): Array<number | null> {
  return input.map((value, index) => index >= size ? value - input[index - size] : null);
}

function roc(input: readonly number[], size: number): Array<number | null> {
  return input.map((value, index) => {
    if (index < size || input[index - size] === 0) {
      return null;
    }

    return ((value - input[index - size]) / input[index - size]) * 100;
  });
}

function values(data: readonly ChartPoint[], key: keyof ChartPoint): number[] {
  return data.map((point) => {
    const value = point[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : point.close;
  });
}

function source(indicator: TechnicalIndicatorConfig): keyof ChartPoint {
  const value = indicator.params['source'];
  return value === 'open' || value === 'high' || value === 'low' || value === 'close' ? value : 'close';
}

function period(indicator: TechnicalIndicatorConfig, fallback = 14): number {
  return param(indicator, 'period', fallback);
}

function param(indicator: TechnicalIndicatorConfig, key: string, fallback: number): number {
  const value = indicator.params[key];
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : fallback;
}

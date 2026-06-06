import { Injectable } from '@angular/core';

import type { IndicatorDefinition } from './indicator.models';
import type { IndicatorType, TechnicalIndicatorConfig } from '../charting/charting.models';

const SOURCE_OPTIONS = ['close', 'open', 'high', 'low'] as const;

const DEFINITIONS: readonly IndicatorDefinition[] = [
  {
    type: 'SMA',
    label: 'Simple Moving Average',
    panel: 'MAIN',
    color: '#f6c55b',
    defaultParams: { period: 14, source: 'close' },
    fields: [
      { key: 'period', label: 'Period', type: 'number', min: 1, step: 1 },
      { key: 'source', label: 'Source', type: 'select', options: SOURCE_OPTIONS }
    ]
  },
  {
    type: 'EMA',
    label: 'Exponential Moving Average',
    panel: 'MAIN',
    color: '#60a5fa',
    defaultParams: { period: 14, source: 'close' },
    fields: [
      { key: 'period', label: 'Period', type: 'number', min: 1, step: 1 },
      { key: 'source', label: 'Source', type: 'select', options: SOURCE_OPTIONS }
    ]
  },
  {
    type: 'RSI',
    label: 'Relative Strength Index',
    panel: 'SEPARATE',
    color: '#a78bfa',
    defaultParams: { period: 14, source: 'close' },
    fields: [
      { key: 'period', label: 'Period', type: 'number', min: 1, step: 1 },
      { key: 'source', label: 'Source', type: 'select', options: SOURCE_OPTIONS }
    ]
  },
  {
    type: 'MACD',
    label: 'MACD',
    panel: 'SEPARATE',
    color: '#34d399',
    defaultParams: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    fields: [
      { key: 'fastPeriod', label: 'Fast Period', type: 'number', min: 1, step: 1 },
      { key: 'slowPeriod', label: 'Slow Period', type: 'number', min: 1, step: 1 },
      { key: 'signalPeriod', label: 'Signal Period', type: 'number', min: 1, step: 1 }
    ]
  },
  {
    type: 'BOLLINGER_BANDS',
    label: 'Bollinger Bands',
    panel: 'MAIN',
    color: '#f97316',
    defaultParams: { period: 20, standardDeviation: 2, source: 'close' },
    fields: [
      { key: 'period', label: 'Period', type: 'number', min: 1, step: 1 },
      { key: 'standardDeviation', label: 'Standard Deviation', type: 'number', min: 0.1, step: 0.1 },
      { key: 'source', label: 'Source', type: 'select', options: SOURCE_OPTIONS }
    ]
  },
  {
    type: 'MOMENTUM',
    label: 'Momentum',
    panel: 'SEPARATE',
    color: '#22d3ee',
    defaultParams: { period: 10, source: 'close' },
    fields: [
      { key: 'period', label: 'Period', type: 'number', min: 1, step: 1 },
      { key: 'source', label: 'Source', type: 'select', options: SOURCE_OPTIONS }
    ]
  },
  {
    type: 'ROC',
    label: 'Rate of Change',
    panel: 'SEPARATE',
    color: '#fb7185',
    defaultParams: { period: 12, source: 'close' },
    fields: [
      { key: 'period', label: 'Period', type: 'number', min: 1, step: 1 },
      { key: 'source', label: 'Source', type: 'select', options: SOURCE_OPTIONS }
    ]
  },
  {
    type: 'VOLUME',
    label: 'Volume',
    panel: 'SEPARATE',
    color: '#94a3b8',
    defaultParams: {},
    fields: []
  }
];

@Injectable({ providedIn: 'root' })
export class TechnicalIndicatorsService {
  readonly definitions = DEFINITIONS;

  getDefinition(type: IndicatorType): IndicatorDefinition {
    const definition = DEFINITIONS.find((item) => item.type === type);

    if (!definition) {
      throw new Error(`Unsupported indicator type: ${type}`);
    }

    return definition;
  }

  createConfig(type: IndicatorType, params?: Record<string, number | string>): TechnicalIndicatorConfig {
    const definition = this.getDefinition(type);

    return {
      id: `${type.toLowerCase()}-${Date.now()}-${Math.round(Math.random() * 10_000)}`,
      type,
      label: definition.label,
      params: {
        ...definition.defaultParams,
        ...params
      },
      panel: definition.panel,
      color: definition.color
    };
  }
}

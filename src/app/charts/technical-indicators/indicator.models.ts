import type { IndicatorPanel, IndicatorType, TechnicalIndicatorConfig } from '../charting/charting.models';

export interface IndicatorDefinition {
  type: IndicatorType;
  label: string;
  panel: IndicatorPanel;
  color: string;
  defaultParams: Record<string, number | string>;
  fields: readonly IndicatorConfigField[];
}

export interface IndicatorConfigField {
  key: string;
  label: string;
  type: 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
}

export interface IndicatorConfigDialogData {
  definition: IndicatorDefinition;
  config?: TechnicalIndicatorConfig;
}

export type { TechnicalIndicatorConfig };

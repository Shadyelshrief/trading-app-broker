import {
  WatchListCondition,
  WatchListConfig
} from '../saved-watch-list/saved-watch-list.models';

export function validateWatchListConfig(config: WatchListConfig): string | null {
  if (!config.name.trim()) {
    return 'Watch List Name is required.';
  }

  if (!config.sourceType) {
    return 'Source is required.';
  }

  if (config.sourceType === 'SELECTED_SYMBOLS' && (config.selectedSymbols?.length ?? 0) === 0) {
    return 'Selected Symbols source requires at least one watched symbol.';
  }

  const invalidCondition = config.conditions?.find((condition, index) =>
    !isConditionValid(condition, index)
  );

  if (invalidCondition) {
    return 'Condition expressions must include field, operator, and value.';
  }

  return null;
}

export function isConditionValid(condition: WatchListCondition, index: number): boolean {
  if (index > 0 && !condition.join) {
    return false;
  }

  if (!condition.field || !condition.operator) {
    return false;
  }

  if (condition.value === null || condition.value === undefined || `${condition.value}`.trim() === '') {
    return false;
  }

  return Number.isFinite(Number(condition.value));
}

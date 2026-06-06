export {
  ClientOption,
  PortfolioOption,
  SymbolOption,
  WatchListCondition,
  WatchListConfig,
  WatchListJoin,
  WatchListOperator,
  WatchListSourceFilters,
  WatchListSourceType
} from '../saved-watch-list/saved-watch-list.models';

export interface WatchListDialogData {
  mode: 'create' | 'edit';
  config?: import('../saved-watch-list/saved-watch-list.models').WatchListConfig;
}

export interface WatchListDialogResult {
  action: 'saved' | 'deleted';
  configId?: string;
}

export interface WatchListSourceOption {
  label: string;
  value: import('../saved-watch-list/saved-watch-list.models').WatchListSourceType;
}

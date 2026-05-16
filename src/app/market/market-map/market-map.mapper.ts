import { buildTickTopic, parseTickTopic, WebSocketState } from '../../core/market-data';
import { parseFullMarketFeederTick } from '../full-market/full-market-feed.mapper';
import { getDirectionClass, resolveDirection } from '../utils/direction.util';
import { calculateMarketMapColor } from './market-map-color.util';
import {
  getMarketMapCriteriaLabel,
  getMarketMapMarketLabel
} from './market-map.filters';
import {
  MarketMapConnectionState,
  MarketMapFilters,
  MarketMapSettings,
  MarketMapSortCriteria,
  MarketMapSymbol
} from './market-map.models';
import { getSharedSymbolOptions } from '../../shared/utils/symbol-reference.util';

const MARKET_SHORT_NAMES: Record<string, string> = {
  adx: 'ADX',
  dfm: 'DFM',
  tadawul: 'TADAWUL'
};

export function buildMarketMapReferenceSymbols(market: MarketMapFilters['market']): MarketMapSymbol[] {
  return getSharedSymbolOptions()
    .filter((symbol) => symbol.market.toLowerCase() === market)
    .map(
      (symbol): MarketMapSymbol => ({
        symbolId: symbol.symbolId,
        symbolName: symbol.symbolName,
        market: getMarketMapMarketLabel(market),
        marketShortName: symbol.market,
        lastPrice: 0,
        changePercent: 0,
        change: 0,
        numberOfTrades: 0,
        valid: false,
        direction: 'UNCHANGED',
        color: '#334155',
        displayValue: '--',
        updatedAt: 0
      })
    );
}

export function buildMarketMapTopics(market: MarketMapFilters['market']): string[] {
  return getSharedSymbolOptions()
    .filter((symbol) => symbol.market.toLowerCase() === market)
    .map((symbol) => buildTickTopic(market, symbol.symbolId));
}

export function applyTickPayloadsToMarketMapSymbols(
  referenceSymbols: readonly MarketMapSymbol[],
  payloads: Record<string, unknown>
): MarketMapSymbol[] {
  const nextSymbols = new Map(
    referenceSymbols.map((symbol) => [`${symbol.marketShortName}:${symbol.symbolId}`, { ...symbol }])
  );

  for (const [topic, payload] of Object.entries(payloads)) {
    if (topic === '__error') {
      continue;
    }

    const tick = parseFullMarketFeederTick(payload, topic);

    if (!tick?.symbolId) {
      continue;
    }

    let exchange = tick.exchange?.toUpperCase();

    if (!exchange) {
      try {
        exchange = parseTickTopic(topic).exchange.toUpperCase();
      } catch {
        exchange = undefined;
      }
    }

    if (!exchange) {
      continue;
    }

    const key = `${MARKET_SHORT_NAMES[exchange.toLowerCase()] ?? exchange}:${tick.symbolId.toUpperCase()}`;
    const current = nextSymbols.get(key);

    if (!current) {
      continue;
    }

    const nextLastPrice = tick.lastPrice ?? current.lastPrice;
    const nextChange = tick.change ?? current.change;
    const nextChangePercent = tick.changePercent ?? current.changePercent;
    const nextNumberOfTrades = tick.numberOfTrades ?? current.numberOfTrades;
    const nextUpdatedAt = tick.updatedAt ?? Date.now();

    nextSymbols.set(key, {
      ...current,
      lastPrice: nextLastPrice,
      change: nextChange,
      changePercent: nextChangePercent,
      numberOfTrades: nextNumberOfTrades,
      direction: resolveDirection(nextChange),
      valid: true,
      updatedAt: nextUpdatedAt
    });
  }

  return [...nextSymbols.values()];
}

export function decorateMarketMapSymbols(
  symbols: readonly MarketMapSymbol[],
  filters: MarketMapFilters,
  settings: MarketMapSettings
): MarketMapSymbol[] {
  const validValues = symbols
    .filter((symbol) => symbol.valid)
    .map((symbol) => getSortValue(symbol, filters.sortCriteria))
    .filter((value) => Number.isFinite(value));
  const min = validValues.length > 0 ? Math.min(...validValues) : 0;
  const max = validValues.length > 0 ? Math.max(...validValues) : 0;

  const sorted = [...symbols].sort((left, right) => compareSymbols(left, right, filters));

  return sorted.map((symbol) => {
    const rawValue = getSortValue(symbol, filters.sortCriteria);
    const displayValue = symbol.valid ? rawValue : '--';
    const visualValue =
      filters.sortOrder === 'ASC' && validValues.length > 0 ? max - rawValue + min : rawValue;

    return {
      ...symbol,
      displayValue,
      color:
        symbol.valid && validValues.length > 0
          ? calculateMarketMapColor(
              visualValue,
              min,
              max,
              settings.startColor,
              settings.endColor
            )
          : settings.invalidSymbolColor
    };
  });
}

export function getSortValue(symbol: MarketMapSymbol, criteria: MarketMapSortCriteria): number {
  switch (criteria) {
    case 'LAST_PRICE':
      return symbol.lastPrice;
    case 'NUMBER_OF_TRADES':
      return symbol.numberOfTrades;
    case 'CHANGE_PERCENT':
    default:
      return symbol.changePercent;
  }
}

export function formatMarketMapValue(value: number | string, criteria: MarketMapSortCriteria): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  if (criteria === 'NUMBER_OF_TRADES') {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(value);
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

export function buildMarketMapTooltip(symbol: MarketMapSymbol): string {
  return [
    `${symbol.symbolId} - ${symbol.symbolName}`,
    `Market: ${symbol.marketShortName}`,
    `Last Price: ${formatMarketMapValue(symbol.lastPrice, 'LAST_PRICE')}`,
    `Change %: ${formatMarketMapValue(symbol.changePercent, 'CHANGE_PERCENT')}`,
    `Change: ${formatMarketMapValue(symbol.change, 'LAST_PRICE')}`
  ].join('\n');
}

export function directionClass(direction: MarketMapSymbol['direction']): string {
  return getDirectionClass(direction);
}

export function criteriaLabel(criteria: MarketMapSortCriteria): string {
  return getMarketMapCriteriaLabel(criteria);
}

export function mapConnectionState(state: WebSocketState | null): MarketMapConnectionState {
  if (!state) {
    return 'DISCONNECTED';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'CONNECTED';
  }

  if (state.status === 'reconnecting') {
    return 'RECONNECTING';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'CONNECTING';
  }

  return 'DISCONNECTED';
}

export function mapConnectionLabel(state: MarketMapConnectionState): string {
  switch (state) {
    case 'CONNECTED':
      return 'Feed live';
    case 'RECONNECTING':
      return 'Reconnecting...';
    case 'CONNECTING':
      return 'Connecting...';
    default:
      return 'Disconnected';
  }
}

function compareSymbols(
  left: MarketMapSymbol,
  right: MarketMapSymbol,
  filters: MarketMapFilters
): number {
  if (left.valid !== right.valid) {
    return left.valid ? -1 : 1;
  }

  const delta = getSortValue(left, filters.sortCriteria) - getSortValue(right, filters.sortCriteria);

  if (delta !== 0) {
    return filters.sortOrder === 'ASC' ? delta : -delta;
  }

  return left.symbolId.localeCompare(right.symbolId);
}

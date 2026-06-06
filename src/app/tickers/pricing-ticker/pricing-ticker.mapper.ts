import { buildTickTopic } from '../../core/market-data';
import { FullMarketFeederTick, parseFullMarketFeederTick } from '../../market/full-market/full-market-feed.mapper';
import { resolveDirection } from '../../market/utils/direction.util';
import { MarketTickerItem } from '../../shared/components/market-ticker/market-ticker.component';
import { getWatchListSymbolUniverse } from '../../watchlists/saved-watch-list/saved-watch-list.mapper';
import { SymbolOption, WatchListConfig } from '../../watchlists/saved-watch-list/saved-watch-list.models';
import { TickerSettings } from '../ticker-settings.models';
import { PricingTickerItem } from './pricing-ticker.models';

export function resolvePricingTickerSymbols(
  settings: TickerSettings,
  watchLists: readonly WatchListConfig[]
): SymbolOption[] {
  if (settings.symbols?.length) {
    return dedupeSymbols(settings.symbols);
  }

  if (settings.watchListId) {
    const watchList = watchLists.find((list) => list.id === settings.watchListId);

    if (watchList?.selectedSymbols?.length) {
      return dedupeSymbols(watchList.selectedSymbols);
    }
  }

  return getWatchListSymbolUniverse().filter((symbol) => {
    const marketMatches =
      !settings.market ||
      settings.market === 'all' ||
      symbol.marketShortName.toLowerCase() === settings.market.toLowerCase();
    const sectorMatches = !settings.sector || settings.sector === 'all' || symbol.sector === settings.sector;

    return marketMatches && sectorMatches;
  });
}

export function buildPricingTickerTopics(symbols: readonly SymbolOption[]): string[] {
  return symbols.map((symbol) => buildTickTopic(resolveExchange(symbol), symbol.symbolId));
}

export function mapPricingTickerPayloads(
  payloads: Record<string, unknown>,
  symbols: readonly SymbolOption[]
): PricingTickerItem[] {
  const metadata = new Map(symbols.map((symbol) => [`${resolveExchange(symbol)}:${symbol.symbolId.toLowerCase()}`, symbol]));

  return Object.entries(payloads)
    .map(([topic, payload]) => {
      const tick = parseFullMarketFeederTick(payload, topic);

      if (!tick?.symbolId) {
        return null;
      }

      return mapTickToPricingTickerItem(tick, metadata);
    })
    .filter((item): item is PricingTickerItem => item !== null)
    .sort((left, right) => `${left.market}:${left.symbolId}`.localeCompare(`${right.market}:${right.symbolId}`));
}

export function mapPricingTickerItemToMarketTicker(item: PricingTickerItem): MarketTickerItem {
  return {
    id: `${item.market}:${item.symbolId}`,
    primary: item.symbolId,
    secondary: item.symbolName,
    market: item.market,
    price: item.tradePrice,
    volume: item.totalVolume,
    change: item.change,
    changePercent: item.changePercent,
    direction: item.changeDirection,
    raw: item
  };
}

export function getPricingTickerSectors(settings: TickerSettings): string[] {
  const symbols = getWatchListSymbolUniverse().filter(
    (symbol) =>
      !settings.market ||
      settings.market === 'all' ||
      symbol.marketShortName.toLowerCase() === settings.market.toLowerCase()
  );

  return ['all', ...new Set(symbols.map((symbol) => symbol.sector).filter((sector): sector is string => Boolean(sector)))];
}

function mapTickToPricingTickerItem(
  tick: FullMarketFeederTick,
  metadata: ReadonlyMap<string, SymbolOption>
): PricingTickerItem | null {
  const exchange = (tick.exchange ?? '').toLowerCase();
  const symbolId = tick.symbolId?.toUpperCase();

  if (!symbolId) {
    return null;
  }

  const symbol = metadata.get(`${exchange}:${symbolId.toLowerCase()}`);
  const change = tick.change ?? 0;

  return {
    symbolId,
    symbolName: symbol?.symbolName ?? symbolId,
    tradePrice: tick.tradePrice ?? tick.lastPrice ?? 0,
    totalVolume: tick.totalVolume ?? 0,
    change,
    changePercent: tick.changePercent ?? 0,
    changeDirection: resolveDirection(change),
    market: symbol?.marketShortName ?? tick.exchange?.toUpperCase() ?? 'ADX',
    currency: tick.currency ?? symbol?.currency ?? 'AED',
    updatedAt: tick.updatedAt ?? Date.now()
  };
}

function resolveExchange(symbol: SymbolOption): string {
  return symbol.marketShortName === 'TADAWUL' ? 'tadawul' : symbol.marketShortName.toLowerCase();
}

function dedupeSymbols(symbols: readonly SymbolOption[]): SymbolOption[] {
  const seen = new Set<string>();
  const result: SymbolOption[] = [];

  for (const symbol of symbols) {
    const key = `${symbol.marketShortName}:${symbol.symbolId}`;

    if (!seen.has(key)) {
      seen.add(key);
      result.push(symbol);
    }
  }

  return result;
}

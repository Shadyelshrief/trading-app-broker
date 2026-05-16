export type MarketDepthOrderType = 'REGULAR' | 'SPECIAL';

export function buildMbpTopic(exchange: string, symbolId: string): string {
  return `market:${exchange.trim().toLowerCase()}:${symbolId.trim().toLowerCase()}:mbp`;
}

export function buildMboTopic(
  exchange: string,
  symbolId: string,
  orderType: MarketDepthOrderType
): string {
  const base = `market:${exchange.trim().toLowerCase()}:${symbolId.trim().toLowerCase()}:mbo`;
  return orderType === 'SPECIAL' ? `${base}:special` : base;
}

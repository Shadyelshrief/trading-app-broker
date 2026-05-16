export interface ParsedTopic {
  raw: string;
  normalized: string;
  namespace: string;
  venue?: string;
  symbol?: string;
  channel?: string;
  segments: readonly string[];
  isPrivate: boolean;
}

const TOPIC_SEPARATOR = ':';

export function normalizeTopic(topic: string): string {
  if (typeof topic !== 'string') {
    throw new Error('Market topic must be a string.');
  }

  const normalized = topic
    .trim()
    .toLowerCase()
    .split(TOPIC_SEPARATOR)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join(TOPIC_SEPARATOR);

  if (!normalized) {
    throw new Error('Market topic cannot be empty.');
  }

  const segments = normalized.split(TOPIC_SEPARATOR);

  if (segments.length < 2) {
    throw new Error(`Invalid market topic "${topic}". Expected at least 2 segments.`);
  }

  return normalized;
}

export function parseTopic(topic: string): ParsedTopic {
  const normalized = normalizeTopic(topic);
  const segments = normalized.split(TOPIC_SEPARATOR);
  const [namespace, venue, symbol, channel] = segments;

  return {
    raw: topic,
    normalized,
    namespace,
    venue,
    symbol,
    channel,
    segments,
    isPrivate: namespace === 'private' || namespace === 'orders'
  };
}

export function buildTickTopic(exchange: string, symbolId: string): string {
  return normalizeTopic(`market:${exchange}:${symbolId}:tick`);
}

export function parseTickTopic(topic: string): { exchange: string; symbolId: string } {
  const parsed = parseTopic(topic);

  if (parsed.namespace !== 'market' || parsed.channel !== 'tick' || !parsed.venue || !parsed.symbol) {
    throw new Error(`Invalid tick topic "${topic}". Expected market:{exchange}:{symbol}:tick`);
  }

  return {
    exchange: parsed.venue,
    symbolId: parsed.symbol
  };
}

export function buildTradesTopic(exchange: string, symbolId?: string): string {
  return normalizeTopic(
    symbolId ? `market:${exchange}:${symbolId}:trades` : `market:${exchange}:trades`
  );
}

export function parseTradesTopic(topic: string): { exchange: string; symbolId?: string } {
  const normalized = normalizeTopic(topic);
  const segments = normalized.split(TOPIC_SEPARATOR);

  if (segments[0] !== 'market' || segments[1] === undefined || segments[segments.length - 1] !== 'trades') {
    throw new Error(`Invalid trades topic "${topic}". Expected market:{exchange}:trades or market:{exchange}:{symbol}:trades`);
  }

  if (segments.length === 3) {
    return {
      exchange: segments[1]
    };
  }

  if (segments.length === 4) {
    return {
      exchange: segments[1],
      symbolId: segments[2]
    };
  }

  throw new Error(`Invalid trades topic "${topic}". Expected market:{exchange}:trades or market:{exchange}:{symbol}:trades`);
}

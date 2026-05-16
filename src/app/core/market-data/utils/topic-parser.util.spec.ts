import { normalizeTopic, parseTopic } from './topic-parser.util';

describe('topic-parser.util', () => {
  it('normalizes feeder topics to a stable lowercase key', () => {
    expect(normalizeTopic(' Market:ADX:IHC:Tick ')).toBe('market:adx:ihc:tick');
  });

  it('parses topic metadata for routing decisions', () => {
    expect(parseTopic('private:orders:filled')).toEqual({
      raw: 'private:orders:filled',
      normalized: 'private:orders:filled',
      namespace: 'private',
      venue: 'orders',
      symbol: 'filled',
      channel: undefined,
      segments: ['private', 'orders', 'filled'],
      isPrivate: true
    });
  });

  it('throws on invalid topics', () => {
    expect(() => normalizeTopic('tick')).toThrowError(/Invalid market topic/i);
  });
});

import { buildFullMarketRowsFromAssets } from './full-market-reference.data';

describe('full market reference data', () => {
  it('creates a row for every asset returned by the selected market', () => {
    const assets = Array.from({ length: 144 }, (_, index) => ({
      symbol: `ADX${index + 1}`,
      name: `ADX Company ${index + 1}`,
      marketCode: 'ADX',
      sector: index % 2 === 0 ? 'Banks' : 'Industrials'
    }));

    const rows = buildFullMarketRowsFromAssets('adx', assets);

    expect(rows).toHaveSize(144);
    expect(rows[0]).toEqual(jasmine.objectContaining({
      symbolId: 'ADX1',
      symbolName: 'ADX Company 1',
      market: 'ADX',
      sector: 'Banks'
    }));
  });

  it('deduplicates symbols and excludes assets from another market', () => {
    const rows = buildFullMarketRowsFromAssets('DFM', [
      { symbol: 'EMAAR', name: 'Emaar Properties', marketCode: 'DFM' },
      { symbol: 'emaar', name: 'Duplicate', marketCode: 'dfm' },
      { symbol: 'FAB', name: 'First Abu Dhabi Bank', marketCode: 'ADX' }
    ]);

    expect(rows.map((row) => row.symbolId)).toEqual(['EMAAR']);
  });

  it('uses known metadata when the API omits optional fields', () => {
    const [row] = buildFullMarketRowsFromAssets('DFM', [{ symbol: 'EMAAR', marketCode: 'DFM' }]);

    expect(row).toEqual(jasmine.objectContaining({
      symbolName: 'Emaar Properties',
      sector: 'Real Estate',
      currency: 'AED'
    }));
  });
});

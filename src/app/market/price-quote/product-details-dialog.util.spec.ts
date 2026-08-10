import { buildProductDetailsDialogState } from './product-details-dialog.util';

describe('product details dialog state', () => {
  it('normalizes a grid row into price quote state', () => {
    const state = buildProductDetailsDialogState({
      symbolId: 'emaar',
      symbolName: 'Emaar Properties',
      marketName: 'Dubai Financial Market',
      currency: 'AED'
    });

    expect(state).toEqual(jasmine.objectContaining({
      title: 'Product Details - EMAAR',
      route: '/app/pricing/price-quote/dfm/emaar'
    }));
    expect(state?.context.quote).toEqual(jasmine.objectContaining({
      symbolId: 'EMAAR',
      symbolName: 'Emaar Properties',
      market: 'DFM',
      currency: 'AED'
    }));
  });

  it('uses raw order data when display rows omit the market', () => {
    const state = buildProductDetailsDialogState({
      symbolId: 'FAB',
      symbolName: 'First Abu Dhabi Bank',
      raw: { marketName: 'Abu Dhabi Securities Exchange' }
    });

    expect(state?.context.quote.market).toBe('ADX');
  });

  it('rejects rows without a symbol or market', () => {
    expect(buildProductDetailsDialogState({ symbolId: 'EMAAR' })).toBeNull();
    expect(buildProductDetailsDialogState({ market: 'DFM' })).toBeNull();
  });
});

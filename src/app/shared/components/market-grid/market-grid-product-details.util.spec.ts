import { isProductDetailsField } from './market-grid-product-details.util';

describe('isProductDetailsField', () => {
  it('recognizes product symbol identifier and name columns', () => {
    expect(isProductDetailsField('symbolId')).toBeTrue();
    expect(isProductDetailsField('symbolName')).toBeTrue();
    expect(isProductDetailsField('symbol')).toBeTrue();
    expect(isProductDetailsField('securityId')).toBeTrue();
    expect(isProductDetailsField('securityName')).toBeTrue();
  });

  it('does not treat prices or unrelated names as product links', () => {
    expect(isProductDetailsField('bidPrice')).toBeFalse();
    expect(isProductDetailsField('shortName')).toBeFalse();
    expect(isProductDetailsField(undefined)).toBeFalse();
  });
});

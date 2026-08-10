const PRODUCT_DETAILS_FIELDS = new Set([
  'symbol',
  'symbolId',
  'symbolName',
  'securityId',
  'securityName'
]);

export function isProductDetailsField(field: string | null | undefined): boolean {
  return typeof field === 'string' && PRODUCT_DETAILS_FIELDS.has(field);
}

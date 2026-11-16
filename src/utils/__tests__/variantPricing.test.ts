import { activeVariantCount, hasVariantDiscount, normalizedVariantPrice, variantSellingPrice } from '../variantPricing';
import type { ProductVariant } from '../../api/quickCartApi';

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  _id: 'variant-1', quantity: 100, unit: 'g', price: 20, discountPrice: 18, stock: 5, isActive: true, ...overrides,
});

describe('variant pricing helpers', () => {
  it('counts active variants and excludes inactive options', () => {
    expect(activeVariantCount([variant(), variant({ _id: 'variant-2', isActive: false }), variant({ _id: 'variant-3' })])).toBe(2);
    expect(activeVariantCount(undefined)).toBe(0);
  });

  it('uses a valid discount only when it is below the listed price', () => {
    expect(hasVariantDiscount(variant())).toBe(true);
    expect(variantSellingPrice(variant())).toBe(18);
    expect(hasVariantDiscount(variant({ discountPrice: 25 }))).toBe(false);
    expect(variantSellingPrice(variant({ discountPrice: 25 }))).toBe(20);
  });

  it('normalizes supported mass and volume units accurately', () => {
    expect(normalizedVariantPrice(variant({ quantity: 500, unit: 'g', discountPrice: undefined }))).toEqual({ price: 4, unit: '100 g' });
    expect(normalizedVariantPrice(variant({ quantity: 1, unit: 'kg', discountPrice: undefined }))).toEqual({ price: 2, unit: '100 g' });
    expect(normalizedVariantPrice(variant({ quantity: 2, unit: 'L', discountPrice: undefined }))).toEqual({ price: 1, unit: '100 ml' });
    expect(normalizedVariantPrice(variant({ unit: 'pack' }))).toBeUndefined();
  });
});

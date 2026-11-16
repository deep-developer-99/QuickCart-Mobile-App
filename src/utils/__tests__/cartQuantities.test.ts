import type { CartItem } from '../../api/quickCartApi';
import { getCartQuantityAction, getProductCartSummary } from '../cartQuantities';

const item = (variantId: string, quantity: number): CartItem => ({
  product: { _id: 'product-1', name: 'Tea' },
  variantId,
  quantity,
});

describe('getProductCartSummary', () => {
  it('sums quantities across variants for the requested product', () => {
    const summary = getProductCartSummary(
      [item('100g', 2), item('200g', 3), item('500g', 1), {
        product: { _id: 'other-product', name: 'Coffee' },
        variantId: 'bag',
        quantity: 8,
      }],
      'product-1',
    );

    expect(summary.totalQuantity).toBe(6);
    expect(summary.distinctVariantCount).toBe(3);
    expect(summary.items).toHaveLength(3);
  });

  it('counts a product without variants as one distinct cart line', () => {
    const summary = getProductCartSummary(
      [{ product: { _id: 'product-1', name: 'Tea' }, quantity: 2 }],
      'product-1',
    );

    expect(summary.totalQuantity).toBe(2);
    expect(summary.distinctVariantCount).toBe(1);
  });

  it('returns a zero summary when the product is absent', () => {
    expect(getProductCartSummary([], 'product-1')).toEqual({
      items: [],
      totalQuantity: 0,
      distinctVariantCount: 0,
    });
  });
});

describe('getCartQuantityAction', () => {
  it('opens the variant sheet for add and plus when multiple variants are purchasable', () => {
    expect(getCartQuantityAction('add', 3, 0)).toBe('openVariantSheet');
    expect(getCartQuantityAction('increase', 3, 1)).toBe('openVariantSheet');
  });

  it('directly adds or increases a single purchasable variant', () => {
    expect(getCartQuantityAction('add', 1, 0)).toBe('direct');
    expect(getCartQuantityAction('increase', 1, 1)).toBe('direct');
  });

  it('decreases directly for one cart variant and opens the sheet for multiple cart variants', () => {
    expect(getCartQuantityAction('decrease', 3, 1)).toBe('direct');
    expect(getCartQuantityAction('decrease', 3, 2)).toBe('openVariantSheet');
  });
});

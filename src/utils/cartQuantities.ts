import type { CartItem } from '../api/quickCartApi';

export const getProductCartSummary = (
  cartItems: CartItem[] = [],
  productId: string,
) => {
  const items = cartItems.filter(item => item.product?._id === productId);
  return {
    items,
    totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
    distinctVariantCount: new Set(items.map(item => item.variantId ?? '')).size,
  };
};

export const getProductVariantCartSummary = (
  cartItems: CartItem[] = [],
  productId: string,
  variantId?: string,
) =>
  getProductCartSummary(
    cartItems.filter(
      item =>
        item.product?._id === productId &&
        (item.variantId ?? '') === (variantId ?? ''),
    ),
    productId,
  );

export type CartQuantityIntent = 'add' | 'increase' | 'decrease';

export const getCartQuantityAction = (
  intent: CartQuantityIntent,
  purchasableVariantCount: number,
  distinctVariantCount: number,
) => {
  if (intent === 'decrease') {
    return distinctVariantCount > 1 ? 'openVariantSheet' : 'direct';
  }
  return purchasableVariantCount > 1 ? 'openVariantSheet' : 'direct';
};

import reducer, {
  addCartLine,
  beginCartHydration,
  hydrateCart,
  removePurchasedCartLines,
  removeCartLine,
  setCartLineQuantity,
} from '../cartSlice';
import type { CartProduct } from '../../../api/quickCartApi';

const product: CartProduct = {
  _id: 'product-a',
  name: 'Milk',
  image: 'https://example.test/milk.jpg',
  variants: [{ _id: 'variant-500', quantity: 500, unit: 'ml', price: 40, discountPrice: 35, stock: 3, isActive: true }],
};

describe('local cart slice', () => {
  it('hydrates a user-scoped cart and restores the product and variant snapshots', () => {
    const initial = reducer(undefined, beginCartHydration('user-a'));
    const restored = reducer(initial, hydrateCart({
      userId: 'user-a',
      items: [{ product, variantId: 'variant-500', quantity: 2 }],
    }));

    expect(restored.hydratedForUserId).toBe('user-a');
    expect(restored.items[0]).toMatchObject({ product: { name: 'Milk' }, variantId: 'variant-500', quantity: 2 });
  });

  it('merges duplicate product variants, caps quantity at stock, updates and removes locally', () => {
    let state = reducer(undefined, beginCartHydration('user-a'));
    state = reducer(state, hydrateCart({ userId: 'user-a', items: [] }));
    state = reducer(state, addCartLine({ userId: 'user-a', product, variantId: 'variant-500', quantity: 2 }));
    state = reducer(state, addCartLine({ userId: 'user-a', product, variantId: 'variant-500', quantity: 2 }));
    expect(state.items).toHaveLength(1);
    expect(state.items[0].quantity).toBe(3);

    state = reducer(state, setCartLineQuantity({ userId: 'user-a', productId: 'product-a', variantId: 'variant-500', quantity: 2 }));
    expect(state.items[0].quantity).toBe(2);
    state = reducer(state, removeCartLine({ userId: 'user-a', productId: 'product-a', variantId: 'variant-500' }));
    expect(state.items).toEqual([]);
  });

  it('ignores other-account actions and resets in-memory state when the account changes', () => {
    let state = reducer(undefined, beginCartHydration('user-a'));
    state = reducer(state, hydrateCart({ userId: 'user-a', items: [{ product, variantId: 'variant-500', quantity: 1 }] }));
    state = reducer(state, addCartLine({ userId: 'user-b', product, variantId: 'variant-500' }));
    expect(state.items).toHaveLength(1);
    state = reducer(state, beginCartHydration('user-b'));
    expect(state).toMatchObject({ ownerId: 'user-b', hydratedForUserId: null, items: [] });
  });

  it('removes only the quantity confirmed in a successful order', () => {
    let state = reducer(undefined, beginCartHydration('user-a'));
    state = reducer(state, hydrateCart({ userId: 'user-a', items: [{ product, variantId: 'variant-500', quantity: 3 }] }));
    state = reducer(state, removePurchasedCartLines({ userId: 'user-a', items: [{ productId: 'product-a', variantId: 'variant-500', quantity: 2 }] }));
    expect(state.items[0].quantity).toBe(1);
  });
});

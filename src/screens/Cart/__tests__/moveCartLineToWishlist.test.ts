import type { CartItem } from '../../../api/quickCartApi';
import { moveCartLineToWishlist } from '../moveCartLineToWishlist';

const item: CartItem = {
  product: { _id: 'product-1', name: 'Milk', variants: [] },
  variantId: 'variant-2',
  quantity: 3,
};

const setup = () => {
  const removeLine = jest.fn();
  const setWishlisted = jest.fn().mockResolvedValue(true);
  let currentUserId: string | null = 'user-1';
  let confirmed = false;
  const operation = (patch: Partial<Parameters<typeof moveCartLineToWishlist>[0]> = {}) => moveCartLineToWishlist({
    item,
    userId: 'user-1',
    isWishlistPending: false,
    isAlreadyConfirmed: false,
    setWishlisted,
    getCurrentUserId: () => currentUserId,
    isConfirmed: () => confirmed,
    removeLine,
    ...patch,
    ...(patch.getCurrentUserId ? {} : { getCurrentUserId: () => currentUserId }),
    ...(patch.isConfirmed ? {} : { isConfirmed: () => confirmed }),
  });
  return {
    operation,
    removeLine,
    setWishlisted,
    setUser: (userId: string | null) => { currentUserId = userId; },
    setConfirmed: (value: boolean) => { confirmed = value; },
  };
};

describe('moveCartLineToWishlist', () => {
  it('removes the cart line only after wishlist confirmation', async () => {
    const state = setup();
    state.setWishlisted.mockImplementation(async () => { state.setConfirmed(true); return true; });

    await expect(state.operation()).resolves.toBe(true);
    expect(state.removeLine).toHaveBeenCalledWith({ userId: 'user-1', productId: 'product-1', variantId: 'variant-2' });
  });

  it('keeps the cart line when the wishlist request fails', async () => {
    const state = setup();
    state.setWishlisted.mockResolvedValue(false);

    await expect(state.operation()).resolves.toBe(false);
    expect(state.removeLine).not.toHaveBeenCalled();
  });

  it('does not add a duplicate when the product is already confirmed', async () => {
    const state = setup();
    state.setConfirmed(true);

    await expect(state.operation({ isAlreadyConfirmed: true })).resolves.toBe(true);
    expect(state.setWishlisted).not.toHaveBeenCalled();
    expect(state.removeLine).toHaveBeenCalledTimes(1);
  });

  it('removes only the selected variant line', async () => {
    const state = setup();
    state.setConfirmed(true);

    await state.operation({ isAlreadyConfirmed: true });
    expect(state.removeLine).toHaveBeenCalledWith({ userId: 'user-1', productId: 'product-1', variantId: 'variant-2' });
  });

  it('does not assume an in-flight wishlist request has succeeded', async () => {
    const state = setup();

    await expect(state.operation({ isWishlistPending: true })).resolves.toBe(false);
    expect(state.setWishlisted).not.toHaveBeenCalled();
    expect(state.removeLine).not.toHaveBeenCalled();
  });

  it('does not remove a cart line after an account switch', async () => {
    const state = setup();
    state.setWishlisted.mockImplementation(async () => { state.setConfirmed(true); state.setUser('user-2'); return true; });

    await expect(state.operation()).resolves.toBe(false);
    expect(state.removeLine).not.toHaveBeenCalled();
  });
});

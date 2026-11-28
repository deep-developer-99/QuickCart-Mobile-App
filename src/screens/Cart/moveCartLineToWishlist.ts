import type { CartItem } from '../../api/quickCartApi';

type Dependencies = {
  item: CartItem;
  userId: string;
  isWishlistPending: boolean;
  isAlreadyConfirmed: boolean;
  setWishlisted: () => Promise<boolean>;
  getCurrentUserId: () => string | null;
  isConfirmed: () => boolean;
  removeLine: (payload: { userId: string; productId: string; variantId: string }) => void;
};

export const moveCartLineToWishlist = async ({
  item,
  userId,
  isWishlistPending,
  isAlreadyConfirmed,
  setWishlisted,
  getCurrentUserId,
  isConfirmed,
  removeLine,
}: Dependencies): Promise<boolean> => {
  const productId = item.product?._id;
  const variantId = item.variantId;
  if (!productId || !variantId || isWishlistPending || !userId) return false;

  if (!isAlreadyConfirmed && !(await setWishlisted())) return false;
  if (getCurrentUserId() !== userId || !isConfirmed()) return false;

  removeLine({ userId, productId, variantId });
  return true;
};

import React, { memo } from 'react';
import { Pressable, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useSelector } from 'react-redux';

import { AppText as Text } from './AppText';
import type { CartProduct } from '../api/quickCartApi';
import type { RootState } from '../store/store';
import { useWishlistActions } from '../hooks/useWishlistActions';

interface WishlistHeartButtonProps {
  product: CartProduct;
  buttonStyle: StyleProp<ViewStyle>;
  heartStyle: StyleProp<TextStyle>;
  addLabel: string;
  removeLabel: string;
  hitSlop?: number;
}

const WishlistHeartButton = ({
  product,
  buttonStyle,
  heartStyle,
  addLabel,
  removeLabel,
  hitSlop = 8,
}: WishlistHeartButtonProps) => {
  const isWishlisted = useSelector((state: RootState) =>
    state.wishlist.items.some(item => item._id === product._id),
  );
  const { toggleWishlist } = useWishlistActions();

  return (
    <Pressable
      style={buttonStyle}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={isWishlisted ? removeLabel : addLabel}
      onPress={() => toggleWishlist(product)}
    >
      <Text style={heartStyle}>{isWishlisted ? '♥' : '♡'}</Text>
    </Pressable>
  );
};

export default memo(WishlistHeartButton);

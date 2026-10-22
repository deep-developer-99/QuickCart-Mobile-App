import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  type CartItem,
  useAddToCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '../api/quickCartApi';
import { radius, spacing, typography, useTheme } from '../theme';

type CartQuantityControlProps = {
  productId: string;
  stock?: number;
  cartItem?: CartItem;
  compact?: boolean;
  disabled?: boolean;
  onAdded?: () => void;
};

const CartQuantityControl = ({
  productId,
  stock,
  cartItem,
  compact = false,
  disabled = false,
  onAdded,
}: CartQuantityControlProps) => {
  const { theme, mode } = useTheme();
  const styles = useStyles();
  const [addToCart, { isLoading: adding }] = useAddToCartMutation();
  const [updateCartItem, { isLoading: updating }] =
    useUpdateCartItemMutation();
  const [removeCartItem, { isLoading: removing }] =
    useRemoveCartItemMutation();

  const isBusy = adding || updating || removing || disabled;
  const quantity = cartItem?.quantity ?? 0;
  const maximumQuantity = stock || cartItem?.product?.stock || 1;

  const handleAdd = async () => {
    if (isBusy) return;

    try {
      await addToCart({ productId, quantity: 1 }).unwrap();
      onAdded?.();
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    }
  };

  const handleQuantityChange = async (nextQuantity: number) => {
    if (isBusy || !cartItem) return;

    try {
      if (nextQuantity <= 0) {
        await removeCartItem(productId).unwrap();
        return;
      }

      if (nextQuantity > maximumQuantity) return;

      await updateCartItem({ productId, quantity: nextQuantity }).unwrap();
    } catch (error) {
      console.error('Failed to update cart quantity:', error);
    }
  };

  if (!cartItem || quantity <= 0) {
    return (
      <Pressable
        style={[
          styles.addButton,
          compact && styles.compactAddButton,
          !compact && styles.fullAddButton,
          !compact && mode === 'dark' && styles.fullAddButtonDark,
        ]}
        onPress={handleAdd}
        onPressIn={event => event.stopPropagation()}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel="Add product to cart"
      >
        {adding ? (
          <ActivityIndicator size="small" color={theme.colors.white} />
        ) : (
          <Text style={styles.addText}>{compact ? 'Add' : 'Add To Cart'}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <View style={[styles.quantityControl, !compact && styles.fullQuantityControl]}>
      <Pressable
        style={styles.quantityButton}
        onPress={() => handleQuantityChange(quantity - 1)}
        onPressIn={event => event.stopPropagation()}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel="Decrease cart quantity"
      >
        <Text style={styles.quantitySymbol}>−</Text>
      </Pressable>

      {isBusy ? (
        <ActivityIndicator size="small" color={theme.colors.cyan} />
      ) : (
        <Text style={styles.quantityValue}>{quantity}</Text>
      )}

      <Pressable
        style={styles.quantityButton}
        onPress={() => handleQuantityChange(quantity + 1)}
        onPressIn={event => event.stopPropagation()}
        disabled={isBusy || quantity >= maximumQuantity}
        accessibilityRole="button"
        accessibilityLabel="Increase cart quantity"
      >
        <Text
          style={[
            styles.quantitySymbol,
            quantity >= maximumQuantity && styles.disabledText,
          ]}
        >
          +
        </Text>
      </Pressable>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['theme']['colors']) =>
  StyleSheet.create({
    addButton: {
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.control,
      borderWidth: 1,
      borderColor: colors.cyan,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    compactAddButton: {
      minHeight: 36,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.lg,
    },
    fullAddButton: { minHeight: 61, borderRadius: radius.md, flex: 1 },
    fullAddButtonDark: { backgroundColor: colors.cyan },
    addText: { ...typography.body2Medium, color: colors.white },
    quantityControl: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
    },
    fullQuantityControl: { minHeight: 44, width: 132 },
    quantityButton: {
      minWidth: 40,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantitySymbol: { fontSize: 21, color: colors.text, lineHeight: 23 },
    disabledText: { color: colors.grey100 },
    quantityValue: { ...typography.body2Medium, color: colors.text },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default CartQuantityControl;

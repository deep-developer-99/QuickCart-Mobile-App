import { AppText as Text } from './AppText';
import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import {
  type CartItem,
  useAddToCartMutation,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '../api/quickCartApi';
import { radius, spacing, typography, useTheme } from '../theme';
import type { ProductVariant } from '../api/quickCartApi';
import { hasVariantDiscount, variantDiscountPercentage, variantSellingPrice } from '../utils/variantPricing';

type CartQuantityControlProps = {
  productId: string;
  stock?: number;
  cartItem?: CartItem;
  cartItems?: CartItem[];
  compact?: boolean;
  darkModeCompactAddButton?: boolean;
  disabled?: boolean;
  onAdded?: () => void;
  variants?: ProductVariant[];
  selectedVariantId?: string;
};

const CartQuantityControl = ({
  productId,
  stock,
  cartItem,
  cartItems,
  compact = false,
  darkModeCompactAddButton = false,
  disabled = false,
  onAdded,
  variants = [],
  selectedVariantId: requestedVariantId,
}: CartQuantityControlProps) => {
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const styles = useStyles();
  const [addToCart, { isLoading: adding }] = useAddToCartMutation();
  const [updateCartItem, { isLoading: updating }] =
    useUpdateCartItemMutation();
  const [removeCartItem, { isLoading: removing }] =
    useRemoveCartItemMutation();
  const activeVariants = variants.filter(item => item.isActive);
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | undefined>(() => requestedVariantId ?? activeVariants.find(item => item.stock > 0)?._id);
  const [showVariantPicker, setShowVariantPicker] = React.useState(false);
  const selectedVariant = activeVariants.find(item => item._id === selectedVariantId) ?? activeVariants.find(item => item.stock > 0);
  const selectedCartItem = cartItems?.find(item => item.product?._id === productId && (item.variantId ?? '') === (selectedVariant?._id ?? '')) ?? (cartItem && (cartItem.variantId ?? '') === (selectedVariant?._id ?? '') ? cartItem : undefined);
  React.useEffect(() => {
    if (requestedVariantId && requestedVariantId !== selectedVariantId) setSelectedVariantId(requestedVariantId);
  }, [requestedVariantId, selectedVariantId]);

  const isBusy = adding || updating || removing || disabled;
  const quantity = selectedCartItem?.quantity ?? 0;
  const maximumQuantity = selectedVariant?.stock ?? stock ?? 1;

  const handleAdd = async () => {
    if (isBusy) return;

    try {
      await addToCart({ productId, quantity: 1, ...(selectedVariant ? { variantId: selectedVariant._id } : {}) }).unwrap();
      setShowVariantPicker(false);
      onAdded?.();
    } catch (error) {
      console.error('Failed to add product to cart:', error);
    }
  };

  const handleQuantityChange = async (nextQuantity: number) => {
    if (isBusy || !selectedCartItem) return;

    try {
      if (nextQuantity <= 0) {
        await removeCartItem({ productId, ...(selectedVariant ? { variantId: selectedVariant._id } : {}) }).unwrap();
        return;
      }

      if (nextQuantity > maximumQuantity) return;

      await updateCartItem({ productId, quantity: nextQuantity, ...(selectedVariant ? { variantId: selectedVariant._id } : {}) }).unwrap();
    } catch (error) {
      console.error('Failed to update cart quantity:', error);
    }
  };

  if (!selectedCartItem || quantity <= 0) {
    return (
      <>
      <Pressable
        style={[
          styles.addButton,
          compact && styles.compactAddButton,
          !compact && styles.fullAddButton,
          !compact && mode === 'dark' && styles.fullAddButtonDark,
          compact &&
            darkModeCompactAddButton &&
            mode === 'dark' &&
            styles.compactAddButtonDark,
        ]}
        onPress={() => activeVariants.length ? setShowVariantPicker(true) : void handleAdd()}
        onPressIn={event => event.stopPropagation()}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={t('ui.common.addProductToCart')}
      >
        {adding ? (
          <ActivityIndicator size="small" color={theme.colors.white} />
        ) : (
          <Text style={styles.addText}>
            {compact ? t('ui.common.add') : t('ui.common.addToCart')}
          </Text>
        )}
      </Pressable>
      <Modal visible={showVariantPicker} transparent animationType="fade" onRequestClose={() => setShowVariantPicker(false)}>
        <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, gap: 10 }}>
            <Text style={{ ...typography.body2Medium, color: theme.colors.text }}>Choose an option</Text>
            {activeVariants.map(item => <Pressable key={item._id} disabled={item.stock <= 0} onPress={() => setSelectedVariantId(item._id)} style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: selectedVariant?._id === item._id ? theme.colors.cyan : theme.colors.border, opacity: item.stock <= 0 ? 0.45 : 1 }}><Text style={{ color: theme.colors.text }}>{item.quantity} {item.unit} | {String.fromCharCode(0x20b9)}{variantSellingPrice(item)}{hasVariantDiscount(item) ? <Text> <Text style={{ textDecorationLine: 'line-through' }}>{String.fromCharCode(0x20b9)}{item.price}</Text> {variantDiscountPercentage(item)}% off</Text> : null}</Text><Text style={{ color: theme.colors.secondaryText }}>{item.stock > 0 ? `${item.stock} available` : 'Out of stock'}</Text></Pressable>)}
            <Pressable onPress={() => void handleAdd()} disabled={!selectedVariant || isBusy} style={{ padding: 13, borderRadius: 10, backgroundColor: theme.colors.control, alignItems: 'center' }}><Text style={{ color: theme.colors.white }}>Add to Cart</Text></Pressable>
          </View>
        </View>
      </Modal>
      </>
    );
  }

  return (
    <>
    <View style={[styles.quantityControl, !compact && styles.fullQuantityControl]}>
      <Pressable
        style={styles.quantityButton}
        onPress={() => handleQuantityChange(quantity - 1)}
        onPressIn={event => event.stopPropagation()}
        disabled={isBusy}
        accessibilityRole="button"
        accessibilityLabel={t('ui.common.decreaseCartQuantity')}
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
        accessibilityLabel={t('ui.common.increaseCartQuantity')}
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
    <Modal visible={showVariantPicker} transparent animationType="fade" onRequestClose={() => setShowVariantPicker(false)}>
      <View style={{ flex: 1, backgroundColor: '#0008', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, gap: 10 }}>
          <Text style={{ ...typography.body2Medium, color: theme.colors.text }}>Choose an option</Text>
          {activeVariants.map(item => <Pressable key={item._id} disabled={item.stock <= 0} onPress={() => setSelectedVariantId(item._id)} style={{ padding: 12, borderRadius: 10, borderWidth: 1, borderColor: selectedVariant?._id === item._id ? theme.colors.cyan : theme.colors.border, opacity: item.stock <= 0 ? 0.45 : 1 }}><Text style={{ color: theme.colors.text }}>{item.quantity} {item.unit} | {String.fromCharCode(0x20b9)}{variantSellingPrice(item)}{hasVariantDiscount(item) ? <Text> <Text style={{ textDecorationLine: 'line-through' }}>{String.fromCharCode(0x20b9)}{item.price}</Text> {variantDiscountPercentage(item)}% off</Text> : null}</Text><Text style={{ color: theme.colors.secondaryText }}>{item.stock > 0 ? `${item.stock} available` : 'Out of stock'}</Text></Pressable>)}
          <Pressable onPress={() => void handleAdd()} disabled={!selectedVariant || isBusy} style={{ padding: 13, borderRadius: 10, backgroundColor: theme.colors.control, alignItems: 'center' }}><Text style={{ color: theme.colors.white }}>Add to Cart</Text></Pressable>
        </View>
      </View>
    </Modal>
    </>
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
    compactAddButtonDark: { backgroundColor: colors.cyan },
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

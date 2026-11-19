import { AppText as Text } from './AppText';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  type CartItem,
  type CartProduct,
} from '../api/quickCartApi';
import type { ProductVariant } from '../api/quickCartApi';
import { radius, spacing, typography, useTheme } from '../theme';
import {
  getCartQuantityAction,
  getProductCartSummary,
  getProductVariantCartSummary,
} from '../utils/cartQuantities';
import ProductVariantBottomSheet from './ProductVariantBottomSheet';
import type { RootState, AppDispatch } from '../store/store';
import { addCartLine, decrementCartLine, incrementCartLine } from '../store/slices/cartSlice';

type CartQuantityControlProps = {
  productId: string;
  stock?: number;
  cartItem?: CartItem;
  compact?: boolean;
  disabled?: boolean;
  onAdded?: () => void;
  variants?: ProductVariant[];
  selectedVariantId?: string;
  productName?: string;
  productImage?: string;
  quantityScope?: 'product' | 'variant';
};

const CartQuantityControl = ({
  productId,
  stock,
  cartItem,
  compact = false,
  disabled = false,
  onAdded,
  variants = [],
  selectedVariantId: requestedVariantId,
  productName = 'Choose a variant',
  productImage,
  quantityScope = 'product',
}: CartQuantityControlProps) => {
  const { t } = useTranslation();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? '');
  const localItems = useSelector(
    (state: RootState) => state.cart.items.filter(item => item.product?._id === productId),
    (left, right) => left.length === right.length && left.every((item, index) => item === right[index]),
  );
  const hydratedForUserId = useSelector((state: RootState) => state.cart.hydratedForUserId);
  const [showVariantPicker, setShowVariantPicker] = React.useState(false);
  const activeVariants = variants.filter(item => item.isActive);
  const purchasableVariants = activeVariants.filter(item => item.stock > 0);
  const actionVariantCount = quantityScope === 'variant' ? 1 : purchasableVariants.length;
  const opensVariantSheet = actionVariantCount > 1;
  const [selectedVariantId, setSelectedVariantId] = React.useState<string | undefined>(
    () => requestedVariantId ?? purchasableVariants[0]?._id,
  );
  const effectiveSelectedVariantId = requestedVariantId ?? selectedVariantId;
  const selectedVariant =
    activeVariants.find(item => item._id === effectiveSelectedVariantId) ??
    purchasableVariants[0];
  const currentCartItems = cartItem ? [cartItem] : localItems;
  const allProductCart = getProductCartSummary(currentCartItems, productId);
  const productCart =
    quantityScope === 'variant'
      ? getProductVariantCartSummary(currentCartItems, productId, selectedVariant?._id)
      : allProductCart;
  const isBusy = disabled || !userId || hydratedForUserId !== userId;
  const productSnapshot: CartProduct = { _id: productId, name: productName, image: productImage, variants };
  const directEntries = productCart.items.map(item => ({
    item,
    variant:
      activeVariants.find(candidate => candidate._id === item.variantId) ??
      (activeVariants.length === 1 ? activeVariants[0] : undefined),
  }));
  const directEntry = directEntries[0];

  React.useEffect(() => {
    if (requestedVariantId && requestedVariantId !== selectedVariantId) {
      setSelectedVariantId(requestedVariantId);
    }
  }, [requestedVariantId, selectedVariantId]);

  const addOne = () => {
    if (!selectedVariant && activeVariants.length > 0) return;
    if (selectedVariant && selectedVariant.stock <= 0) return;
    dispatch(addCartLine({ userId, product: productSnapshot, variantId: selectedVariant?._id ?? '', quantity: 1 }));
    onAdded?.();
    return Promise.resolve();
  };

  const setVariantQuantity = (entry: typeof directEntries[number], direction: 'increase' | 'decrease') => {
    const variantId = entry.variant?._id ?? entry.item.variantId;
    if (!variantId) return Promise.resolve();
    dispatch(direction === 'decrease'
      ? decrementCartLine({ userId, productId, variantId })
      : incrementCartLine({ userId, productId, variantId }));
    return Promise.resolve();
  };

  const handleDecrease = () => {
    if (isBusy) return;
    if (getCartQuantityAction('decrease', actionVariantCount, productCart.distinctVariantCount) === 'openVariantSheet') {
      setShowVariantPicker(true);
    } else if (directEntry) {
      return setVariantQuantity(directEntry, 'decrease');
    }
  };

  const handleIncrease = () => {
    if (isBusy) return;
    if (getCartQuantityAction('increase', actionVariantCount, productCart.distinctVariantCount) === 'openVariantSheet') {
      setShowVariantPicker(true);
    } else if (directEntry) {
      return setVariantQuantity(directEntry, 'increase');
    } else if (!directEntry && selectedVariant && selectedVariant.stock > 0) {
      addOne();
    }
  };

  const modal = quantityScope === 'product' && activeVariants.length > 1 ? (
    <ProductVariantBottomSheet
      visible={showVariantPicker}
      productId={productId}
      productName={productName}
      productImage={productImage}
      variants={activeVariants}
      cartItems={currentCartItems}
      product={productSnapshot}
      onClose={() => setShowVariantPicker(false)}
      onAdded={onAdded}
    />
  ) : null;

  if (productCart.totalQuantity === 0) {
    return (
      <>
        <Pressable
          style={[styles.addButton, compact ? styles.compactAddButton : styles.fullAddButton]}
          onPress={() => (getCartQuantityAction('add', actionVariantCount, productCart.distinctVariantCount) === 'openVariantSheet' ? setShowVariantPicker(true) : addOne())}
          onPressIn={event => event.stopPropagation()}
          disabled={isBusy || (!opensVariantSheet && (!selectedVariant || selectedVariant.stock <= 0))}
          accessibilityRole="button"
          accessibilityLabel={t('ui.common.addProductToCart')}
        >
          <Text style={compact ? styles.compactAddText : styles.addText}>
            {compact ? t('ui.common.add') : t('ui.common.addToCart')}
          </Text>
        </Pressable>
        {compact && opensVariantSheet ? (
          <Text style={styles.optionsText} onPressIn={event => event.stopPropagation()}>
            {purchasableVariants.length} options
          </Text>
        ) : null}
        {modal}
      </>
    );
  }

  return (
    <>
      <View style={[styles.quantityControl, compact ? styles.compactQuantityControl : styles.fullQuantityControl]}>
        <Pressable
          style={[styles.quantityButton, compact && styles.compactQuantityButton]}
          onPress={handleDecrease}
          onPressIn={event => event.stopPropagation()}
          disabled={isBusy || !directEntry && productCart.distinctVariantCount <= 1}
          accessibilityRole="button"
          accessibilityLabel={t('ui.common.decreaseCartQuantity')}
        >
          <Text style={[styles.quantitySymbol, compact && styles.compactQuantitySymbol]}>−</Text>
        </Pressable>
        <Text style={[styles.quantityValue, compact && styles.compactQuantityValue]}>
          {isBusy ? '…' : productCart.totalQuantity}
        </Text>
        <Pressable
          style={[styles.quantityButton, compact && styles.compactQuantityButton]}
          onPress={handleIncrease}
          onPressIn={event => event.stopPropagation()}
          disabled={isBusy || (!opensVariantSheet && directEntry !== undefined && directEntry.item.quantity >= (directEntry.variant?.stock ?? stock ?? 1))}
          accessibilityRole="button"
          accessibilityLabel={t('ui.common.increaseCartQuantity')}
        >
          <Text style={[styles.quantitySymbol, compact && styles.compactQuantitySymbol]}>+</Text>
        </Pressable>
      </View>
      {modal}
    </>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['theme']['colors']) =>
  StyleSheet.create({
    addButton: {
      minHeight: 44,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: '#168B43',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },
    compactAddButton: { minHeight: 36, borderRadius: radius.sm, paddingHorizontal: spacing.sm, width: '100%' },
    fullAddButton: { minHeight: 54, width: '100%', borderRadius: radius.md },
    addText: { ...typography.body2Medium, color: '#168B43' },
    compactAddText: { ...typography.body2Medium, color: '#168B43' },
    optionsText: { textAlign: 'center', color: colors.secondaryText, fontSize: 10, marginTop: 2 },
    quantityControl: {
      minHeight: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: '#168B43',
      borderRadius: radius.sm,
      backgroundColor: '#168B43',
    },
    compactQuantityControl: { width: '100%' },
    fullQuantityControl: { minHeight: 54, width: '100%' },
    quantityButton: { minWidth: 40, minHeight: 36, alignItems: 'center', justifyContent: 'center' },
    compactQuantityButton: { minWidth: 22, flex: 1 },
    quantitySymbol: { fontSize: 21, color: colors.white, lineHeight: 23 },
    compactQuantitySymbol: { fontSize: 18, lineHeight: 21 },
    quantityValue: { ...typography.body2Medium, color: colors.white },
    compactQuantityValue: { minWidth: 18, textAlign: 'center' },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default CartQuantityControl;

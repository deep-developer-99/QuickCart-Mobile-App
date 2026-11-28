import { AppText as Text, AppTextInput as TextInput } from '../../components/AppText';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  ToastAndroid,
  View,
} from 'react-native';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector, useStore } from 'react-redux';

import EmptyCart from './EmptyCart';
import { getVoucherInputScrollDelta } from './voucherKeyboard';
import BackButton from '../../components/common/BackButton';
import { hasVariantDiscount, lowestPricedVariant, variantSellingPrice } from '../../utils/variantPricing';
import type { CartItem, CartProduct } from '../../api/quickCartApi';
import { useGetProductsQuery, useGetWishlistQuery } from '../../api/quickCartApi';
import { useGetAddressesQuery } from '../../api/addressApi';
import ProductVariantBottomSheet from '../../components/ProductVariantBottomSheet';
import { useWishlistActions } from '../../hooks/useWishlistActions';
import { moveCartLineToWishlist } from './moveCartLineToWishlist';
import type { RootState, AppDispatch } from '../../store/store';
import { decrementCartLine, incrementCartLine, removeCartLine } from '../../store/slices/cartSlice';
import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';

const cartKey = (item: CartItem) => `${item.product?._id ?? ''}:${item.variantId ?? ''}`;

const CartScreen = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();

  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? null);
  const { items: savedItems, hydratedForUserId } = useSelector((state: RootState) => state.cart);
  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);
  const confirmedWishlistItems = useSelector((state: RootState) => state.wishlist.confirmedItems);
  const confirmedWishlistIds = useMemo(() => new Set(confirmedWishlistItems.map(product => product._id)), [confirmedWishlistItems]);
  const pendingWishlistIds = useSelector((state: RootState) => state.wishlist.latestOperationByProduct);
  const { setWishlisted } = useWishlistActions();
  useGetWishlistQuery();
  const { data: addressResponse } = useGetAddressesQuery();
  const isLoading = Boolean(userId && hydratedForUserId !== userId);
  const items: CartItem[] = savedItems;

  const [movingProductIds, setMovingProductIds] = useState<string[]>([]);
  const movingProductKeysRef = useRef(new Set<string>());
  const [selectedProduct, setSelectedProduct] = useState<CartProduct | null>(null);
  const [voucherVisible, setVoucherVisible] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');
  const voucherScrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const voucherInputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const voucherScrollOffsetRef = useRef(0);
  const voucherPreKeyboardOffsetRef = useRef(0);
  const voucherKeyboardVisibleRef = useRef(false);

  const scrollVoucherInputIntoView = useCallback(() => {
    const input = voucherInputRef.current;
    const scrollView = voucherScrollRef.current;
    if (!input || !scrollView) return;

    input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
      scrollView.measureInWindow(
        (_scrollX, scrollY, _scrollWidth, scrollHeight) => {
          const delta = getVoucherInputScrollDelta(
            inputY,
            inputHeight,
            scrollY,
            scrollHeight,
            spacing.sm,
          );

          if (Math.abs(delta) > 1) {
            scrollView.scrollTo({
              y: Math.max(0, voucherScrollOffsetRef.current + delta),
              animated: true,
            });
          }
        },
      );
    });
  }, []);

  useEffect(() => {
    if (!voucherVisible) return;

    const keyboardSubscription = Keyboard.addListener('keyboardDidShow', () => {
      if (!voucherKeyboardVisibleRef.current) {
        voucherPreKeyboardOffsetRef.current = voucherScrollOffsetRef.current;
      }
      voucherKeyboardVisibleRef.current = true;
      requestAnimationFrame(scrollVoucherInputIntoView);
    });
    const keyboardHideSubscription = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        voucherKeyboardVisibleRef.current = false;
        requestAnimationFrame(() => {
          voucherScrollRef.current?.scrollTo({
            y: voucherPreKeyboardOffsetRef.current,
            animated: false,
          });
        });
      },
    );

    return () => {
      keyboardSubscription.remove();
      keyboardHideSubscription.remove();
    };
  }, [scrollVoucherInputIntoView, voucherVisible]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) =>
          total +
          variantSellingPrice(item.product?.variants?.find(variant => variant._id === item.variantId)) *
            item.quantity,
        0,
      ),
    [items],
  );

  const recommendationCategory = useMemo(() => {
    const category = items.find(item => item.product?.category)?.product?.category;
    return typeof category === 'string' ? category : category?._id;
  }, [items]);
  const { data: recommendationResponse } = useGetProductsQuery(
    { category: recommendationCategory, page: 1, limit: 12 },
    { skip: !recommendationCategory || items.length === 0 },
  );
  const recommendations = useMemo(() => {
    const inCart = new Set(items.map(item => item.product?._id));
    return (recommendationResponse?.data ?? [])
      .filter(product => !inCart.has(product._id) && lowestPricedVariant(product.variants))
      .slice(0, 8);
  }, [items, recommendationResponse]);
  const addresses = addressResponse?.data ?? [];
  const defaultAddress = addresses.find(address => address.isDefault) ?? addresses[0];
  const confirmedWishlist = wishlistItems.filter(product => confirmedWishlistIds.has(product._id));
  const cartSavings = useMemo(() => items.reduce((sum, item) => {
    const variant = item.product?.variants?.find(entry => entry._id === item.variantId);
    return sum + Math.max(0, (variant?.price ?? 0) - variantSellingPrice(variant)) * item.quantity;
  }, 0), [items]);

  // ₹40 shipping for subtotal up to ₹99; free shipping above ₹99.
  const shippingCost = subtotal > 0 && subtotal <= 99 ? 40 : 0;
  const total = subtotal + shippingCost;

  const changeQuantity = (item: CartItem, direction: 'increase' | 'decrease') => {
    const productId = item.product?._id;

    if (!productId) return;

    if (!item.variantId) return;
    dispatch(direction === 'decrease'
      ? decrementCartLine({ userId: userId ?? '', productId, variantId: item.variantId })
      : incrementCartLine({ userId: userId ?? '', productId, variantId: item.variantId }));
  };

  const moveToWishlist = async (item: CartItem) => {
    const product = item.product;
    const productId = product?._id;
    const ownerAtStart = userId;
    const lineId = cartKey(item);
    if (!product || !productId || !item.variantId || !ownerAtStart || movingProductKeysRef.current.has(lineId)) return;
    movingProductKeysRef.current.add(lineId);
    setMovingProductIds(current => [...current, cartKey(item)]);
    try {
      const moved = await moveCartLineToWishlist({
        item,
        userId: ownerAtStart,
        isWishlistPending: Boolean(pendingWishlistIds[productId]),
        isAlreadyConfirmed: confirmedWishlistIds.has(productId),
        setWishlisted: () => setWishlisted(product, true),
        getCurrentUserId: () => store.getState().auth.user?.id ?? null,
        isConfirmed: () => store.getState().wishlist.confirmedItems.some(entry => entry._id === productId),
        removeLine: payload => dispatch(removeCartLine(payload)),
      });
      if (!moved) return;
      if (Platform.OS === 'android') ToastAndroid.show('Moved to wishlist', ToastAndroid.SHORT);
      else Alert.alert('Wishlist', 'Moved to wishlist');
    } finally {
      movingProductKeysRef.current.delete(lineId);
      setMovingProductIds(current => current.filter(key => key !== cartKey(item)));
    }
  };

  const shareCart = async () => {
    const lines = items.map(item => {
      const variant = item.product?.variants?.find(entry => entry._id === item.variantId);
      return `${item.product?.name ?? 'Product'} (${variant?.quantity ?? ''} ${variant?.unit ?? ''}) × ${item.quantity}`;
    });
    try {
      await Share.share({ message: `My QuickCart basket:\n${lines.join('\n')}\nItems total: ₹${subtotal.toFixed(2)}` });
    } catch (error) {
      console.warn('Unable to share cart summary:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.colors.black} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <BackButton
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
        />

        <Text style={styles.headerTitle}>Checkout</Text>

        <View style={styles.headerActions}>
          <Pressable onPress={() => navigation.navigate('Search')} style={styles.headerAction} accessibilityRole="button" accessibilityLabel="Search products">
            <Text style={styles.headerActionText}>⌕</Text>
          </Pressable>
          <Pressable onPress={shareCart} style={styles.shareButton} accessibilityRole="button" accessibilityLabel="Share cart">
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>
      </View>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.sectionCard}>
              <View style={styles.cardHeadingRow}>
                <View>
                  <Text style={styles.sectionTitle}>Your cart</Text>
                  <Text style={styles.sectionSubtitle}>Shipment of {items.reduce((count, item) => count + item.quantity, 0)} items</Text>
                </View>
                {shippingCost === 0 ? <Text style={styles.freeDelivery}>FREE delivery</Text> : null}
              </View>
              {items.map((item, index) => {
                const product = item.product;
                if (!product) return null;
                const variant = product.variants?.find(entry => entry._id === item.variantId);
                const currentPrice = variantSellingPrice(variant);
                const lineKey = cartKey(item);
                const isMoving = movingProductIds.includes(lineKey);
                return (
                <View key={lineKey} style={[styles.cartItem, index < items.length - 1 && styles.cartItemBorder]}>
                  <Pressable
                    style={styles.imageBox}
                    onPress={() =>
                      navigation.navigate('ProductDetails', { product })
                    }
                    accessibilityRole="button"
                    accessibilityLabel={t('ui.common.viewProductDetails', { name: product.name })}
                  >
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : null}
                  </Pressable>

                  <View style={styles.productDetails}>
                    <View style={styles.productTopLine}>
                      <Pressable style={styles.productNamePressable} onPress={() => navigation.navigate('ProductDetails', { product })} accessibilityRole="button" accessibilityLabel={t('ui.common.viewProductDetails', { name: product.name })}>
                        <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                        {variant ? <Text style={styles.variantText}>{variant.quantity} {variant.unit}</Text> : null}
                      </Pressable>
                      <View style={styles.quantityBox}>
                        <Pressable style={styles.quantityButton} onPress={() => changeQuantity(item, 'decrease')} accessibilityRole="button" accessibilityLabel="Decrease quantity"><Text style={styles.quantitySymbol}>−</Text></Pressable>
                        <Text style={styles.quantity}>{item.quantity}</Text>
                        <Pressable style={styles.quantityButton} onPress={() => changeQuantity(item, 'increase')} accessibilityRole="button" accessibilityLabel="Increase quantity"><Text style={styles.quantitySymbol}>+</Text></Pressable>
                      </View>
                    </View>
                    <View style={styles.productBottomLine}>
                      <View style={styles.priceBlock}>
                        <Text style={styles.currentPrice}>₹{(currentPrice * item.quantity).toFixed(2)}</Text>
                        {variant && hasVariantDiscount(variant) ? <Text style={styles.originalPrice}>₹{(variant.price * item.quantity).toFixed(2)}</Text> : null}
                      </View>
                      <Pressable style={styles.moveButton} onPress={() => moveToWishlist(item)} disabled={isMoving || !userId} accessibilityRole="button">
                        <Text style={styles.moveButtonText}>{isMoving ? 'Saving…' : 'Move to wishlist'}</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
              })}
              <View style={styles.subtotalRow}>
                <Text style={styles.infoLabel}>Items total</Text>
                <Text style={styles.infoValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
            </View>

            {recommendations.length > 0 ? <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>You might also like</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalProducts}>
                {recommendations.map(product => <Pressable key={product._id} style={styles.miniProduct} onPress={() => setSelectedProduct(product)}>
                  {product.image ? <Image source={{ uri: product.image }} style={styles.miniProductImage} resizeMode="cover" /> : <View style={styles.miniProductImage} />}
                  <Text style={styles.miniProductName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.miniProductPrice}>₹{variantSellingPrice(lowestPricedVariant(product.variants)).toFixed(2)}</Text>
                  <Text style={styles.miniProductAdd}>ADD</Text>
                </Pressable>)}
              </ScrollView>
            </View> : null}

            {confirmedWishlist.length > 0 ? <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Your wishlist</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalProducts}>
                {confirmedWishlist.map(product => <Pressable key={product._id} style={styles.miniProduct} onPress={() => setSelectedProduct(product)}>
                  {product.image ? <Image source={{ uri: product.image }} style={styles.miniProductImage} resizeMode="cover" /> : <View style={styles.miniProductImage} />}
                  <Text style={styles.miniProductName} numberOfLines={2}>{product.name}</Text>
                  <Text style={styles.miniProductPrice}>₹{variantSellingPrice(lowestPricedVariant(product.variants)).toFixed(2)}</Text>
                  <Text style={styles.miniProductAdd}>Choose size</Text>
                </Pressable>)}
              </ScrollView>
            </View> : null}

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Bill details</Text>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Items total</Text><Text style={styles.infoValue}>₹{subtotal.toFixed(2)}</Text></View>
              <View style={styles.infoRow}><Text style={styles.infoLabel}>Delivery charge</Text><Text style={styles.infoValue}>{shippingCost > 0 ? `₹${shippingCost.toFixed(2)}` : 'FREE'}</Text></View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Grand total</Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
              {cartSavings > 0 ? <View style={styles.savingsBox}><Text style={styles.savingsTitle}>You save ₹{cartSavings.toFixed(2)}</Text><Text style={styles.savingsCaption}>Savings on discounted items</Text></View> : null}
            </View>

          </ScrollView>

          <View style={[styles.checkoutContainer, { paddingBottom: spacing.md + insets.bottom }]}>
            <Pressable style={styles.addressRow} onPress={() => navigation.navigate('Checkout')} accessibilityRole="button">
              <View style={styles.addressIcon}><Text style={styles.addressIconText}>⌂</Text></View>
              <View style={styles.addressCopy}>
                <Text style={styles.addressTitle}>{defaultAddress ? 'Default delivery address' : 'Select delivery address'}</Text>
                <Text style={styles.addressText} numberOfLines={1}>{defaultAddress ? `${defaultAddress.addressLine}, ${defaultAddress.city}` : 'Choose an address at checkout'}</Text>
              </View>
              <Text style={styles.addressChange}>Change</Text>
            </Pressable>
            <Pressable style={styles.checkoutButton} onPress={() => navigation.navigate('Checkout')} accessibilityRole="button">
              <View style={styles.checkoutAmount}><Text style={styles.checkoutTotal}>₹{total.toFixed(2)}</Text><Text style={styles.checkoutTotalLabel}>TOTAL</Text></View>
              <Text style={styles.checkoutText}>Proceed  ›</Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal
        visible={voucherVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoucherVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVoucherVisible(false)}
          />

          <KeyboardAvoidingView
            style={styles.modalKeyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={styles.voucherSheet}>
              <ScrollView
                ref={voucherScrollRef}
                onScroll={event => {
                  voucherScrollOffsetRef.current =
                    event.nativeEvent.contentOffset.y;
                }}
                scrollEventThrottle={16}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.voucherScrollContent}
              >
                <View style={styles.sheetHandle} />

                <Text style={styles.sheetTitle}>{t('cart.voucher')}</Text>

                <TextInput
                  ref={voucherInputRef}
                  value={voucherCode}
                  onChangeText={setVoucherCode}
                  onFocus={() => requestAnimationFrame(scrollVoucherInputIntoView)}
                  placeholder={t('ui.cart.voucherPlaceholder')}
                  placeholderTextColor={theme.colors.grey150}
                  autoCapitalize="characters"
                  style={styles.voucherInput}
                />

                <Pressable
                  style={styles.applyButton}
                  onPress={() => {
                    // Voucher validation API will be connected here.
                    setVoucherVisible(false);
                  }}
                >
                  <Text style={styles.applyText}>{t('cart.apply')}</Text>
                </Pressable>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
      {selectedProduct ? <ProductVariantBottomSheet visible productId={selectedProduct._id} productName={selectedProduct.name} productImage={selectedProduct.image} variants={selectedProduct.variants ?? []} cartItems={items} product={selectedProduct} onClose={() => setSelectedProduct(null)} /> : null}
    </SafeAreaView>
  );
};

const createStyles = (colors: ThemeColors, mode: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: mode === 'dark' ? colors.background : '#F5F6F7',
    },
    header: {
      height: 60,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
      backgroundColor: colors.surface,
    },
    backButton: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: colors.grey100,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 30,
      lineHeight: 34,
      color: colors.text,
      fontWeight: '300',
    },
    headerTitle: {
      ...typography.body1Medium,
      color: colors.text,
      fontSize: 19,
    },
    headerActions: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerAction: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, borderColor: colors.grey100, alignItems: 'center', justifyContent: 'center' },
    headerActionText: { color: colors.text, fontSize: 25, lineHeight: 29 },
    shareButton: { height: 36, borderRadius: 18, borderWidth: 1, borderColor: colors.grey100, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
    shareText: { color: colors.text, ...typography.captionRegular },
    voucherButton: {
      marginLeft: 'auto',
    },
    voucherText: {
      ...typography.body2Medium,
      color: colors.cyan,
    },
    headerSpacer: {
      marginLeft: 'auto',
      width: 80,
    },
    scrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: 24,
      gap: spacing.md,
    },
    sectionCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface },
    cardHeadingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
    sectionTitle: { ...typography.body1Medium, color: colors.text, fontSize: 18 },
    sectionSubtitle: { ...typography.captionRegular, color: colors.secondaryText, marginTop: 3 },
    freeDelivery: { ...typography.captionRegular, color: mode === 'dark' ? colors.cyan : '#168B43', fontWeight: '700' },
    refreshingRow: {
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartItem: {
      flexDirection: 'row',
      paddingVertical: spacing.md,
    },
    cartItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.grey50 },
    imageBox: {
      width: 76,
      height: 76,
      borderRadius: radius.md,
      overflow: 'hidden',
      backgroundColor: colors.cyan50,
    },
    productImage: {
      width: '100%',
      height: '100%',
    },
    productDetails: {
      flex: 1,
      marginLeft: spacing.sm,
      paddingVertical: 1,
      minWidth: 0,
    },
    productTopLine: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.xs },
    productBottomLine: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: spacing.sm, gap: spacing.xs },
    variantText: { ...typography.captionRegular, color: colors.secondaryText, marginTop: 3 },
    priceBlock: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    moveButton: { paddingVertical: 3, paddingHorizontal: 2 },
    moveButtonText: { ...typography.captionRegular, color: mode === 'dark' ? colors.cyan : '#168B43', textDecorationLine: 'underline' },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    productNamePressable: {
      flex: 1,
      minWidth: 0,
    },
    productName: {
      ...typography.body2Medium,
      color: colors.text,
      paddingRight: spacing.xs,
      lineHeight: 19,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 5,
      borderWidth: 1,
      borderColor: colors.grey100,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 4,
    },
    checkboxSelected: {
      backgroundColor: colors.cyan,
      borderColor: colors.cyan,
    },
    checkmark: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '700',
      lineHeight: 16,
    },
    currentPrice: {
      ...typography.body2Medium,
      color: colors.text,
      marginTop: 0,
    },
    originalPrice: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      textDecorationLine: 'line-through',
      marginTop: 0,
    },
    itemBottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    quantityBox: {
      height: 34,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: mode === 'dark' ? colors.cyan : '#168B43',
      backgroundColor: mode === 'dark' ? colors.cyan : '#168B43',
      borderRadius: 8,
      minWidth: 82,
    },
    quantityButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantitySymbol: {
      fontSize: 21,
      color: colors.white,
    },
    quantity: {
      ...typography.body2Medium,
      color: colors.white,
      minWidth: 19,
      textAlign: 'center',
    },
    deleteButton: {
      width: 34,
      height: 34,
      alignItems: 'center',
      justifyContent: 'center',
    },
    subtotalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.grey50, paddingTop: spacing.sm, marginTop: spacing.xs },
    orderInfoTitle: {
      ...typography.body1Medium,
      color: colors.text,
      marginBottom: 18,
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.sm,
    },
    infoLabel: {
      ...typography.captionRegular,
      color: colors.secondaryText,
    },
    infoValue: {
      ...typography.captionRegular,
      color: colors.secondaryText,
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.xs,
      paddingTop: spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.grey50,
    },
    totalLabel: {
      ...typography.body1Medium,
      color: colors.text,
    },
    totalValue: {
      ...typography.body1Medium,
      color: colors.text,
    },
    horizontalProducts: { paddingTop: spacing.md, gap: spacing.sm },
    miniProduct: { width: 126, padding: spacing.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.grey50, backgroundColor: colors.surface },
    miniProductImage: { width: '100%', height: 82, borderRadius: radius.sm, backgroundColor: colors.cyan50 },
    miniProductName: { ...typography.captionRegular, color: colors.text, minHeight: 34, marginTop: spacing.xs },
    miniProductPrice: { ...typography.body2Medium, color: colors.text, marginTop: 2 },
    miniProductAdd: { ...typography.captionRegular, color: mode === 'dark' ? colors.cyan : '#168B43', fontWeight: '700', marginTop: spacing.xs },
    savingsBox: { marginTop: spacing.md, padding: spacing.sm, borderRadius: radius.sm, backgroundColor: mode === 'dark' ? colors.cyan50 : '#EAF5FF' },
    savingsTitle: { ...typography.body2Medium, color: colors.text },
    savingsCaption: { ...typography.captionRegular, color: colors.secondaryText, marginTop: 2 },
    checkoutContainer: {
      paddingHorizontal: spacing.md,
      paddingTop: 10,
      paddingBottom: spacing.md,
      backgroundColor: colors.surface,
    },
    addressRow: { flexDirection: 'row', alignItems: 'center', paddingBottom: 10 },
    addressIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.cyan50, alignItems: 'center', justifyContent: 'center' },
    addressIconText: { color: colors.cyan, fontSize: 20 },
    addressCopy: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
    addressTitle: { ...typography.captionRegular, fontWeight: '700', color: colors.text },
    addressText: { ...typography.captionRegular, color: colors.secondaryText, marginTop: 2 },
    addressChange: { ...typography.captionRegular, color: mode === 'dark' ? colors.cyan : '#168B43', fontWeight: '700', marginLeft: spacing.sm },
    checkoutButton: {
      height: 61,
      borderRadius: radius.md,
      backgroundColor: mode === 'dark' ? colors.cyan : colors.black,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    checkoutAmount: { alignItems: 'flex-start' },
    checkoutTotal: { ...typography.body1Medium, color: colors.white },
    checkoutTotalLabel: { ...typography.captionRegular, color: colors.white, fontSize: 10 },
    checkoutDisabled: {
      opacity: 0.5,
    },
    checkoutText: {
      ...typography.body2Medium,
      color: colors.white,
    },
    loader: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    errorTitle: {
      ...typography.body1Medium,
      color: colors.text,
      textAlign: 'center',
    },
    errorText: {
      ...typography.body2Regular,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    retryButton: {
      marginTop: spacing.lg,
      height: 48,
      paddingHorizontal: 28,
      borderRadius: radius.md,
      backgroundColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
    },
    retryText: {
      ...typography.body2Medium,
      color: colors.white,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.48)',
      justifyContent: 'flex-end',
    },
    modalKeyboardContainer: {
      flex: 1,
      width: '100%',
      justifyContent: 'flex-end',
    },
    voucherSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      maxHeight: '90%',
    },
    voucherScrollContent: {
      paddingHorizontal: spacing.md,
      paddingTop: 8,
      paddingBottom: 34,
    },
    sheetHandle: {
      width: 64,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.grey50,
      alignSelf: 'center',
      marginBottom: 28,
    },
    sheetTitle: {
      ...typography.body1Medium,
      color: colors.text,
      marginBottom: 18,
    },
    voucherInput: {
      height: 58,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      ...typography.body2Regular,
      color: colors.text,
    },
    applyButton: {
      height: 60,
      borderRadius: radius.md,
      backgroundColor: colors.black,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },
    applyText: {
      ...typography.body2Medium,
      color: colors.white,
    },
  });

const useStyles = () => {
  const { theme, mode } = useTheme();
  return React.useMemo(
    () => createStyles(theme.colors, mode),
    [theme.colors, mode],
  );
};

export default CartScreen;

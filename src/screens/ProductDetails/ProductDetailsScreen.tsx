import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import {
  getWishlistProducts,
  useGetCartQuery,
  useAddToWishlistMutation,
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useGetProductByIdQuery,
} from '../../api/quickCartApi';
import CartAddedToast from '../../components/CartAddedToast';
import BackButton from '../../components/common/BackButton';
import CartQuantityControl from '../../components/CartQuantityControl';
import { createProductUrl, isValidProductId } from '../../services/productLinks';
import ShareNodesIcon from '../../assets/icons/share-nodes.svg';

type ProductDetailsRouteProp = RouteProp<RootStackParamList, 'ProductDetails'>;

type DetailProduct = {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  price: number;
  discountPrice?: number;
  stock: number;
  rating?: number;
  reviews?: number;
  isActive?: boolean;
};

const HeartIcon = ({
  color = '#FFFFFF',
  filled = false,
}: {
  color?: string;
  filled?: boolean;
}) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M20.8 8.8c0 5.2-8.8 10-8.8 10s-8.8-4.8-8.8-10A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"
      fill={filled ? color : 'none'}
      stroke={color}
      strokeWidth="1.7"
    />
  </Svg>
);

const ProductDetailsScreen = () => {
  const { t } = useTranslation();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const route = useRoute<ProductDetailsRouteProp>();
  const [addToWishlist, { isLoading: addingToWishlist }] =
    useAddToWishlistMutation();
  const [removeFromWishlist, { isLoading: removingFromWishlist }] =
    useRemoveFromWishlistMutation();
  const { data: wishlistResponse } = useGetWishlistQuery();
  const { data: cartResponse, isLoading: cartLoading } = useGetCartQuery();
  const hasProduct = 'product' in route.params;
  const productId = hasProduct ? route.params.product._id : route.params.productId;
  const validProductId = isValidProductId(productId);
  const {
    data: fetchedProductResponse,
    isLoading: productLoading,
    isError: productError,
  } = useGetProductByIdQuery(validProductId ? productId : '', {
    skip: hasProduct || !validProductId,
  });
  const product = hasProduct
    ? (route.params.product as DetailProduct)
    : (fetchedProductResponse?.success
        ? (fetchedProductResponse.data as DetailProduct)
        : undefined);
  const [quantity, setQuantity] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [showAddedMessage, setShowAddedMessage] = useState(false);

  const wishlistIds = useMemo(
    () => getWishlistProducts(wishlistResponse).map(item => item._id),
    [wishlistResponse],
  );
  const isWishlisted = product ? wishlistIds.includes(product._id) : false;
  const updatingWishlist = addingToWishlist || removingFromWishlist;

  const images = useMemo(() => {
    const list = Array.isArray(product?.images)
      ? product.images.filter(Boolean)
      : [];
    if (list.length > 0) return list;
    return product?.image ? [product.image] : [];
  }, [product?.images, product?.image]);

  const shareProduct = useCallback(async () => {
    if (!product) return;
    const productUrl = createProductUrl(product._id);
    if (!productUrl) return;
    const shortDescription = product.description?.trim().slice(0, 180);
    const message = [
      t('ui.product.shareMessage', { brand: 'QuickCart' }),
      '',
      product.name,
      shortDescription || t('ui.product.shareFallback', { brand: 'QuickCart' }),
      productUrl,
    ].join('\n');
    await Share.share({ message, url: productUrl, title: product.name });
  }, [product, t]);

  const sellingPrice = product?.discountPrice ?? product?.price ?? 0;
  const hasDiscount =
    product?.discountPrice !== undefined &&
    product.discountPrice < (product?.price ?? 0);

  const description =
    product?.description?.trim() ||
    t('ui.product.defaultDescription');

  const shouldCollapse = description.length > 220;
  const visibleDescription =
    expanded || !shouldCollapse
      ? description
      : `${description.slice(0, 220).trim()}...`;

  const handleBuyNow = () => {
    if (!product) return;
    navigation.navigate('Checkout', {
      mode: 'buyNow',
      product,
      quantity,
    });
  };

  const cartItem = cartResponse?.data?.items?.find(
    item => item.product?._id === product?._id,
  );

  const showCartToast = useCallback(() => {
    setShowAddedMessage(true);
    setTimeout(() => setShowAddedMessage(false), 2800);
  }, []);

  const handleWishlistToggle = useCallback(async () => {
    if (!product) return;
    try {
      if (isWishlisted) {
        await removeFromWishlist(product._id).unwrap();
      } else {
        await addToWishlist({ productId: product._id }).unwrap();
      }
    } catch (error) {
      console.error('Failed to update wishlist:', error);
    }
  }, [addToWishlist, isWishlisted, product, removeFromWishlist]);

  if (!product || product.isActive === false) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.unavailableState}>
          <Text style={styles.description}>
            {productLoading
              ? t('ui.product.loading')
              : productError || !validProductId || product?.isActive === false
                ? t('ui.product.unavailable')
                : t('ui.product.notFound')}
          </Text>
          <BackButton
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={4}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          hitSlop={4}
        />
      </View>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.imageSection}>
          {images.length > 0 ? (
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={event => {
                const imageWidth = event.nativeEvent.layoutMeasurement.width;
                if (imageWidth > 0) {
                  setActiveImage(
                    Math.round(event.nativeEvent.contentOffset.x / imageWidth),
                  );
                }
              }}
            >
              {images.map((uri, index) => (
                <Image
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={[styles.productImage, { width }]}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackText}>{t('ui.common.noImage')}</Text>
            </View>
          )}

          <View style={styles.topControls}>
            <Pressable
              style={[
                styles.heartCircle,
                updatingWishlist && styles.heartCircleDisabled,
              ]}
              onPress={handleWishlistToggle}
              disabled={updatingWishlist}
              accessibilityRole="button"
              accessibilityLabel={
                isWishlisted
                  ? t('ui.common.removeFromWishlist', { name: product.name })
                  : t('ui.product.addToWishlist', { name: product.name })
              }
            >
              <HeartIcon color={styles.heartIcon.color} filled={isWishlisted} />
            </Pressable>
          </View>

          {images.length > 1 ? (
            <View style={styles.imageDots}>
              {images.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeImage && styles.activeDot,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.shareRow}>
          <Pressable
            style={styles.shareButton}
            onPress={shareProduct}
            accessibilityRole="button"
            accessibilityLabel={t('ui.product.shareProduct', { name: product.name })}
            hitSlop={4}
          >
            <ShareNodesIcon width={22} height={22} />
          </Pressable>
        </View>

        <View style={styles.sheet}>
          <View style={styles.badges}>
            <Text style={styles.topRated}>{t('ui.product.topRated')}</Text>
            <Text style={styles.freeShipping}>{t('ui.product.freeShipping')}</Text>
          </View>

          <View style={styles.titleRow}>
            <Text style={styles.title}>{product.name}</Text>
            <View style={styles.priceBlock}>
              <Text style={styles.price}>₹ {sellingPrice.toFixed(2)}</Text>
              {hasDiscount ? (
                <Text style={styles.originalPrice}>
                  ₹ {product.price.toFixed(2)}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.ratingRow}>
            <Text style={styles.stars}>★★★★★</Text>
            <Text style={styles.ratingText}>
              {product.rating !== undefined
                ? `${product.rating.toFixed(1)}${
                    product.reviews !== undefined
                      ? ` (${t('ui.product.reviews', { count: product.reviews })})`
                      : ''
                  }`
                : '4.5'}
            </Text>
          </View>

          <Text style={styles.description}>
            {visibleDescription}
            {shouldCollapse ? (
              <Text
                style={styles.readMore}
                onPress={() => setExpanded(value => !value)}
              >
                {expanded ? ` ${t('ui.product.readLess')}` : ` ${t('ui.product.readMore')}`}
              </Text>
            ) : null}
          </Text>

          <Text style={styles.quantityLabel}>{t('ui.product.quantity')}</Text>
          <View style={styles.quantityControl}>
            <Pressable
              style={styles.quantityButton}
              onPress={() => setQuantity(value => Math.max(1, value - 1))}
              disabled={quantity <= 1}
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  quantity <= 1 && styles.disabledText,
                ]}
              >
                −
              </Text>
            </Pressable>
            <Text style={styles.quantityValue}>{quantity}</Text>
            <Pressable
              style={styles.quantityButton}
              onPress={() =>
                setQuantity(value => Math.min(product.stock || 1, value + 1))
              }
              disabled={quantity >= (product.stock || 1)}
            >
              <Text
                style={[
                  styles.quantityButtonText,
                  quantity >= (product.stock || 1) && styles.disabledText,
                ]}
              >
                +
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <CartAddedToast
        visible={showAddedMessage}
        onViewCart={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
      />

      <View style={styles.bottomBar}>
        <Pressable style={styles.buyButton} onPress={handleBuyNow}>
          <Text style={styles.buyText}>{t('ui.product.buyNow')}</Text>
        </Pressable>
        <CartQuantityControl
          productId={product._id}
          stock={product.stock}
          cartItem={cartItem}
          disabled={cartLoading}
          onAdded={showCartToast}
        />
      </View>
    </SafeAreaView>
  );
};

type ThemeMode = 'light' | 'dark';

const createStyles = (
  colors: ThemeColors,
  mode: ThemeMode,
) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollView: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingBottom: 16 },
    header: {
      height: 56,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'flex-start',
      backgroundColor: colors.background,
    },
    backButton: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
      elevation: 0,
    },
    imageSection: {
      height: 290,
      backgroundColor: colors.cyan50,
      position: 'relative',
    },
    productImage: { height: 290 },
    imageFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cyan50,
    },
    fallbackText: { color: colors.secondaryText, fontSize: 14 },
    topControls: {
      position: 'absolute',
      right: 16,
      top: 12,
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    shareRow: {
      height: 60,
      paddingHorizontal: 16,
      justifyContent: 'center',
      alignItems: 'flex-end',
      backgroundColor: colors.background,
    },
    shareButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: colors.grey50,
    },
    unavailableState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
    heartCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: mode === 'dark' ? colors.white : colors.black,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heartCircleDisabled: {
      opacity: 0.65,
    },
    heartIcon: {
      color: mode === 'dark' ? colors.black : colors.white,
    },
    imageDots: {
      position: 'absolute',
      bottom: 10,
      alignSelf: 'center',
      flexDirection: 'row',
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderRadius: 10,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.grey100,
      marginHorizontal: 2,
    },
    activeDot: { backgroundColor: colors.cyan },
    sheet: {
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingTop: 22,
      flexGrow: 1,
    },
    badges: { flexDirection: 'row', gap: 8, marginBottom: 9 },
    topRated: {
      backgroundColor: '#168CE2',
      color: colors.white,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 7,
      fontSize: 10,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    freeShipping: {
      backgroundColor: '#08D38D',
      color: colors.white,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 7,
      fontSize: 10,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    titleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      flex: 1,
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 18,
      lineHeight: 24,
      color: colors.text,
    },
    priceBlock: { alignItems: 'flex-end', minWidth: 82 },
    price: {
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 18,
      color: colors.text,
    },
    originalPrice: {
      marginTop: 2,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 13,
      color: colors.secondaryText,
      textDecorationLine: 'line-through',
    },
    ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 9 },
    stars: { color: '#FFB72B', fontSize: 12, letterSpacing: 1 },
    ratingText: {
      marginLeft: 5,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 11,
      color: colors.text,
    },
    description: {
      marginTop: 12,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 14,
      lineHeight: 21,
      color: colors.secondaryText,
    },
    readMore: {
      color: colors.cyan,
      fontFamily: 'PlusJakartaSans-Medium',
    },
    quantityLabel: {
      marginTop: 14,
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 12,
      color: colors.text,
    },
    quantityControl: {
      width: 96,
      height: 33,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: 8,
      marginTop: 6,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    quantityButton: {
      width: 31,
      height: 31,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quantityButtonText: { fontSize: 21, color: colors.text, lineHeight: 22 },
    disabledText: { color: colors.grey100 },
    quantityValue: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 14,
      color: colors.text,
    },
    addedMessage: {
      position: 'absolute',
      left: 16,
      right: 16,
      top: 44,
      minHeight: 54,
      borderRadius: 12,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      shadowColor: '#000000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    successIcon: {
      width: 25,
      height: 25,
      borderRadius: 7,
      backgroundColor: colors.cyan,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 9,
    },
    successCheck: {
      color: colors.white,
      fontSize: 18,
      fontWeight: '700',
      lineHeight: 20,
    },
    addedText: {
      flex: 1,
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 11,
      lineHeight: 14,
      color: colors.text,
    },
    viewCart: {
      marginLeft: 8,
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 12,
      color: colors.cyan,
    },
    bottomBar: {
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 12,
      flexDirection: 'row',
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: colors.grey50,
    },
    buyButton: {
      flex: 1,
      height: 61,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    buyText: {
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 14,
      color: mode === 'dark' ? colors.cyan : colors.text,
    },
    addButton: {
      flex: 1,
      height: 61,
      borderRadius: 12,
      backgroundColor: mode === 'dark' ? colors.cyan : colors.black,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    buyButtonDisabled: {
      opacity: 0.7,
    },
    addButtonDisabled: { opacity: 0.75 },
    addText: {
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 14,
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

export default ProductDetailsScreen;

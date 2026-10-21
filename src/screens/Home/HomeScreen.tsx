import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useGetBannersQuery,
  useGetCategoriesQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../api/quickCartApi';
import type { Banner } from '../../api/quickCartApi';
import { useGetCartQuery } from '../../api/quickCartApi';
import CartAddedToast from '../../components/CartAddedToast';
import CartQuantityControl from '../../components/CartQuantityControl';
import type { CartProduct } from '../../store/slices/cartSlice';
import type { RootState } from '../../store/store';
import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import {
  getCurrentLocation,
  requestLocationPermission,
  reverseGeocodeCoordinates,
} from '../../services/locationService';

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface Product extends CartProduct {
  category?: string | { _id: string; name: string };
}

const categoryEmoji: Record<string, string> = {
  electronics: '📱',
  fashion: '👜',
  furniture: '🛋️',
  industrial: '🚗',
  'home decor': '🎁',
  health: '🩺',
  'construction & real estate': '🏠',
  'fabrication service': '📏',
  'electrical equipment': '🔌',
};

const productEmoji = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('watch')) return '⌚';
  if (value.includes('headphone')) return '🎧';
  if (value.includes('phone')) return '📱';
  if (value.includes('laptop')) return '💻';
  if (value.includes('shoe')) return '👟';
  if (value.includes('glass')) return '👓';
  return '🛍️';
};

const getBannerImage = (banner: Banner) =>
  banner.image?.trim() || banner.imageUrl?.trim() || null;

const HomeScreen = () => {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const [currentLocation, setCurrentLocation] = useState('Current location');
  const [isLocating, setIsLocating] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const hasRequestedInitialLocation = useRef(false);
  const cartToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectCurrentLocation = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setIsLocating(false);
        Alert.alert(
          'Location permission required',
          'Allow location access in your device settings to detect your current location.',
        );
        return;
      }

      const coordinates = await getCurrentLocation();
      try {
        const label = await reverseGeocodeCoordinates(
          coordinates.latitude,
          coordinates.longitude,
        );
        setCurrentLocation(label || 'Current location');
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
        setCurrentLocation('Address unavailable — tap to retry');
      } finally {
        setIsLocating(false);
      }
    } catch (error) {
      setIsLocating(false);
      console.error('Location permission request failed:', error);
      Alert.alert(
        'Location error',
        'Could not access your location. Please try again.',
      );
    }
  }, [isLocating]);

  useEffect(() => {
    if (hasRequestedInitialLocation.current) return;

    hasRequestedInitialLocation.current = true;
    detectCurrentLocation();
  }, [detectCurrentLocation]);

  const { data: wishlistResponse } = useGetWishlistQuery();
  const { data: cartResponse, isLoading: cartLoading } = useGetCartQuery();
  const cartItemByProductId = useMemo(() => {
    const items = cartResponse?.data?.items ?? [];
    return new Map(items.map(item => [item.product?._id, item]));
  }, [cartResponse]);
  const showAddedToast = useCallback(() => {
    setShowCartToast(true);
    if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    cartToastTimeout.current = setTimeout(() => setShowCartToast(false), 2800);
  }, []);
  const wishlistIds = useMemo(() => {
    const data = wishlistResponse?.data;
    const products = Array.isArray(data) ? data : data?.products ?? [];
    return products.map(item => item._id);
  }, [wishlistResponse]);

  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const {
    data: productResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useGetProductsQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const {
    data: bannerResponse,
    isLoading: bannersLoading,
    isFetching: bannersFetching,
    refetch: refetchBanners,
  } = useGetBannersQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });

  const banners = useMemo<Banner[]>(() => {
    const data = bannerResponse?.data;
    const responseBanners = Array.isArray(data)
      ? data
      : data?.banners ?? bannerResponse?.banners ?? [];
    return responseBanners.filter(banner => Boolean(getBannerImage(banner)));
  }, [bannerResponse]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [invalidBannerIds, setInvalidBannerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const bannerScrollRef = useRef<any>(null);
  const { width: screenWidth } = useWindowDimensions();
  const bannerWidth = Math.max(screenWidth - spacing.lg * 2, 1);
  const bannerHeight = Math.round(
    Math.min(176, Math.max(128, bannerWidth * 0.45)),
  );

  const categories = useMemo<Category[]>(
    () => (Array.isArray(categoryResponse?.data) ? categoryResponse.data : []),
    [categoryResponse],
  );
  const products = useMemo<Product[]>(
    () =>
      Array.isArray(productResponse?.data)
        ? productResponse.data.slice(0, 6)
        : [],
    [productResponse],
  );

  const isRefreshing =
    categoriesFetching || productsFetching || bannersFetching;

  const refreshHome = useCallback(async () => {
    await Promise.all([
      refetchCategories(),
      refetchProducts(),
      refetchBanners(),
    ]);
  }, [refetchBanners, refetchCategories, refetchProducts]);

  const bannerKey = banners.map(banner => banner._id).join('|');

  useEffect(() => {
    setBannerIndex(0);
    setInvalidBannerIds(new Set());
    bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [bannerKey]);

  useEffect(
    () => () => {
      if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (banners.length <= 1) return undefined;

      const interval = setInterval(() => {
        setBannerIndex(current => {
          const next = (current + 1) % banners.length;
          bannerScrollRef.current?.scrollTo({
            x: next * bannerWidth,
            animated: true,
          });
          return next;
        });
      }, 4000);

      return () => clearInterval(interval);
    }, [bannerWidth, banners.length]),
  );

  const handleBannerPress = useCallback(
    async (banner: Banner) => {
      const type = banner.redirectType?.trim().toLowerCase();
      const value = banner.redirectValue?.trim();
      if (!type || !value) return;

      if (type === 'category' || type === 'categories') {
        navigation.navigate('Categories', { categoryId: value });
        return;
      }

      if (type === 'product') {
        const allProducts = Array.isArray(productResponse?.data)
          ? productResponse.data
          : [];
        const product = allProducts.find(item => item._id === value);
        if (product) {
          navigation.navigate('ProductDetails', { product });
        }
        return;
      }

      if (type === 'external' || type === 'url' || type === 'link') {
        try {
          if (await Linking.canOpenURL(value)) {
            await Linking.openURL(value);
          }
        } catch (error) {
          console.warn('Unable to open banner link:', error);
        }
      }
    },
    [navigation, productResponse],
  );

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        refreshHome().catch(error => {
          console.error('Failed to refresh home:', error);
        });
      }, 30_000);

      return () => clearInterval(interval);
    }, [refreshHome]),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 16) }}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={refreshHome} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.logoRow}>
              <View style={styles.logoMark}>
                <Text style={styles.logoMarkText}>Q</Text>
              </View>
              <Text style={styles.logoText}>uickCart</Text>
            </View>

            <View style={styles.headerActions}>
              <Pressable
                onPress={() => navigation.navigate('Search')}
                hitSlop={10}
              >
                <View style={styles.searchIcon}>
                  <View style={styles.searchHandle} />
                </View>
              </Pressable>
              <Pressable
                style={styles.avatar}
                onPress={() => navigation.navigate('Profile')}
                hitSlop={8}
              >
                <Text style={styles.avatarText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.locationRow}
            onPress={detectCurrentLocation}
            disabled={isLocating}
            accessibilityRole="button"
            accessibilityLabel="Detect current delivery location"
            hitSlop={8}
          >
            <Text style={styles.locationPin}>📍</Text>
            <View style={styles.locationCopy}>
              <Text style={styles.locationText}>{t('home.deliverTo')}</Text>
              <Text style={styles.locationStrong} numberOfLines={1}>
                {isLocating ? 'Detecting location…' : currentLocation}
              </Text>
            </View>
            {isLocating ? (
              <ActivityIndicator
                size="small"
                color={styles.locationSpinner.color}
              />
            ) : null}
          </Pressable>
        </View>

        {bannersLoading ? (
          <View
            style={[
              styles.bannerPlaceholder,
              { width: bannerWidth, height: bannerHeight },
            ]}
          >
            <ActivityIndicator size="small" />
          </View>
        ) : banners.length > 0 ? (
          <View
            style={[
              styles.bannerCarousel,
              { width: bannerWidth, height: bannerHeight },
            ]}
          >
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              onMomentumScrollEnd={event => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / bannerWidth,
                );
                setBannerIndex(
                  Math.max(0, Math.min(nextIndex, banners.length - 1)),
                );
              }}
            >
              {banners.map(banner => {
                const image = getBannerImage(banner);
                const imageFailed = invalidBannerIds.has(banner._id);

                return (
                  <Pressable
                    key={banner._id}
                    style={{ width: bannerWidth, height: bannerHeight }}
                    onPress={() => handleBannerPress(banner)}
                    disabled={!banner.redirectType || !banner.redirectValue}
                  >
                    {image && !imageFailed ? (
                      <Image
                        source={{ uri: image }}
                        style={styles.bannerImage}
                        resizeMode="cover"
                        onError={() =>
                          setInvalidBannerIds(current => {
                            const next = new Set(current);
                            next.add(banner._id);
                            return next;
                          })
                        }
                      />
                    ) : (
                      <View style={styles.bannerFallback} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {banners.length > 1 ? (
              <View style={styles.bannerDots}>
                {banners.map((banner, index) => (
                  <View
                    key={banner._id}
                    style={
                      index === bannerIndex ? styles.activeDot : styles.dot
                    }
                  />
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tabs.categories')}</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </Pressable>
          </View>

          {categoriesLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map(category => (
                <Pressable
                  key={category._id}
                  style={styles.categoryCard}
                  onPress={() =>
                    navigation.navigate('Categories', {
                      categoryId: category._id,
                    })
                  }
                >
                  <View style={styles.categoryIcon}>
                    {category.image ? (
                      <Image
                        source={{ uri: category.image }}
                        style={styles.categoryImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.categoryEmoji}>
                        {categoryEmoji[category.name.toLowerCase()] ?? '🛍️'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('home.latestProducts')}</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </Pressable>
          </View>

          {productsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" />
            </View>
          ) : (
            <View style={styles.productGrid}>
              {products.map(product => {
                const sellingPrice = product.discountPrice ?? product.price;
                const isWishlisted = wishlistIds.includes(product._id);

                return (
                  <View key={product._id} style={styles.productCard}>
                    <Pressable
                      style={styles.productImageContainer}
                      onPress={() =>
                        navigation.navigate('ProductDetails', {
                          product,
                        })
                      }
                    >
                      {product.image ? (
                        <Image
                          source={{ uri: product.image }}
                          style={styles.productImage}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={styles.productFallback}>
                          <Text style={styles.productFallbackEmoji}>
                            {productEmoji(product.name)}
                          </Text>
                        </View>
                      )}

                      <Pressable
                        style={styles.heartButton}
                        hitSlop={8}
                        onPress={async event => {
                          event.stopPropagation();
                          try {
                            if (isWishlisted) {
                              await removeFromWishlist(product._id).unwrap();
                            } else {
                              await addToWishlist({
                                productId: product._id,
                              }).unwrap();
                            }
                          } catch (error) {
                            console.error('Failed to update wishlist:', error);
                          }
                        }}
                      >
                        <Text style={styles.heartText}>
                          {isWishlisted ? '♥' : '♡'}
                        </Text>
                      </Pressable>
                    </Pressable>

                    <Text style={styles.productName} numberOfLines={1}>
                      {product.name}
                    </Text>
                    <Text style={styles.productPrice}>
                      ₹{sellingPrice.toFixed(2)}
                    </Text>
                    {product.discountPrice !== undefined &&
                    product.discountPrice < product.price ? (
                      <Text style={styles.originalPrice}>
                        ₹{product.price.toFixed(2)}
                      </Text>
                    ) : null}
                    <View style={styles.cartControl}>
                      <CartQuantityControl
                        productId={product._id}
                        stock={product.stock}
                        cartItem={cartItemByProductId.get(product._id)}
                        disabled={cartLoading}
                        compact
                        onAdded={showAddedToast}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
      <CartAddedToast
        visible={showCartToast}
        onViewCart={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
      />
    </SafeAreaView>
  );
};

type ThemeMode = 'light' | 'dark';

const createStyles = (colors: ThemeColors, mode: ThemeMode) => ({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  headerTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  logoRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.xs,
  },
  logoMarkText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: colors.white,
  },
  logoText: { ...typography.heading3Bold, color: colors.text, fontSize: 18 },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.lg,
  },
  searchIcon: {
    width: 25,
    height: 25,
    borderWidth: 2,
    borderColor: colors.text,
    borderRadius: radius.pill,
    position: 'relative' as const,
  },
  searchHandle: {
    position: 'absolute' as const,
    width: 9,
    height: 2,
    backgroundColor: colors.black,
    right: -6,
    bottom: 0,
    transform: [{ rotate: '48deg' }],
    borderRadius: radius.pill,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.grey50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarText: { ...typography.captionSemiBold, color: colors.secondaryText },
  locationRow: {
    marginTop: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  locationPin: { fontSize: 15, marginRight: spacing.xs },
  locationCopy: { flex: 1, minWidth: 0 },
  locationText: { ...typography.captionRegular, color: colors.secondaryText },
  locationStrong: { ...typography.captionSemiBold, color: colors.text },
  locationSpinner: { color: colors.cyan },
  bannerCarousel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerFallback: {
    flex: 1,
    backgroundColor: colors.grey50,
  },
  bannerPlaceholder: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: colors.grey50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bannerDots: {
    position: 'absolute' as const,
    alignSelf: 'center' as const,
    bottom: spacing.md,
    flexDirection: 'row' as const,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
    marginHorizontal: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.grey100,
    marginHorizontal: 2,
  },
  section: { marginTop: spacing.xxl },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading3Bold, color: colors.text },
  seeAll: { ...typography.captionSemiBold, color: colors.cyan },
  categoryList: { paddingHorizontal: spacing.lg },
  categoryCard: {
    width: 76,
    height: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.grey50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  categoryEmoji: { fontSize: 27 },
  categoryImage: { width: 32, height: 32 },
  categoryName: {
    ...typography.overlineRegular,
    color: colors.text,
    fontSize: 9,
    textAlign: 'center' as const,
  },
  productGrid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
  },
  productCard: {
    width: '48.2%' as const,
    height: 252,
    marginBottom: spacing.lg,
  },
  productImageContainer: {
    height: 138,
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    backgroundColor: colors.grey50,
    position: 'relative' as const,
  },
  productImage: { width: '100%', height: '100%' },
  productFallback: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  productFallbackEmoji: { fontSize: 56 },
  heartButton: {
    position: 'absolute' as const,
    top: 7,
    right: 7,
    width: 27,
    height: 27,
    borderRadius: radius.pill,
    backgroundColor: mode === 'dark' ? colors.white : colors.black,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heartText: {
    color: mode === 'dark' ? colors.black : colors.white,
    fontSize: 17,
    lineHeight: 18,
  },
  productName: {
    ...typography.body2Regular,
    color: colors.text,
    marginTop: spacing.sm,
    height: 22,
    lineHeight: 22,
  },
  productPrice: { ...typography.body2Medium, color: colors.text },
  originalPrice: {
    ...typography.captionRegular,
    color: colors.grey100,
    textDecorationLine: 'line-through' as const,
  },
  cartControl: {
    height: 36,
    marginTop: 'auto' as const,
  },
  loadingBox: {
    height: 100,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
});

const useStyles = () => {
  const { theme, mode } = useTheme();
  return React.useMemo(
    () => createStyles(theme.colors, mode),
    [theme.colors, mode],
  );
};

export default HomeScreen;

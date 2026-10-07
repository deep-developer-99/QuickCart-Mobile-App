import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useGetCategoriesQuery,
  useGetProductsQuery,
  useAddToCartMutation,
} from '../../api/quickCartApi';
import type { CartProduct } from '../../store/slices/cartSlice';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { colors, radius, shadows, spacing, typography } from '../../theme';

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

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [addToCart] = useAddToCartMutation();
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const wishlistIds = useSelector((state: RootState) =>
    state.wishlist.items.map(item => item._id),
  );

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

  const isRefreshing = categoriesFetching || productsFetching;

  const refreshHome = useCallback(async () => {
    await Promise.all([refetchCategories(), refetchProducts()]);
  }, [refetchCategories, refetchProducts]);

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
              <Text style={styles.logoText}>uickMart</Text>
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

          <View style={styles.locationRow}>
            <Text style={styles.locationPin}>📍</Text>
            <Text style={styles.locationText}>
              Deliver to{' '}
              <Text style={styles.locationStrong}>Current location</Text>
            </Text>
          </View>
        </View>

        <Pressable
          style={styles.banner}
          onPress={() => navigation.navigate('Categories')}
        >
          <View style={styles.bannerContent}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>30% OFF</Text>
            </View>
            <Text style={styles.bannerEyebrow}>On selected products</Text>
            <Text style={styles.bannerTitle}>Exclusive Sales</Text>
          </View>
          <Text style={styles.bannerEmoji}>🎧</Text>
          <View style={styles.bannerDots}>
            <View style={styles.activeDot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </Pressable>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.seeAll}>SEE ALL</Text>
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
                  onPress={() => navigation.navigate('Categories')}
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
            <Text style={styles.sectionTitle}>Latest Products</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.seeAll}>SEE ALL</Text>
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
                      onPress={async () => {
                        try {
                          await addToCart({
                            productId: product._id,
                            quantity: 1,
                          }).unwrap();
                        } catch (error) {
                          console.error(
                            'Failed to add product to cart:',
                            error,
                          );
                        }
                      }}
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
                        onPress={() => dispatch(toggleWishlist(product))}
                      >
                        <Text style={styles.heartText}>
                          {isWishlisted ? '♥' : '♡'}
                        </Text>
                      </Pressable>
                    </Pressable>

                    <View style={styles.colorRow}>
                      <View style={[styles.colorDot, styles.dotDark]} />
                      <View style={[styles.colorDot, styles.dotBlue]} />
                      <View style={[styles.colorDot, styles.dotGreen]} />
                      <Text style={styles.colorText}>All 5 Colors</Text>
                    </View>

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
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = {
  container: { flex: 1, backgroundColor: colors.white },
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
  logoText: { ...typography.heading3Bold, color: colors.black, fontSize: 18 },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.lg,
  },
  searchIcon: {
    width: 25,
    height: 25,
    borderWidth: 2,
    borderColor: colors.black,
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
  avatarText: { ...typography.captionSemiBold, color: colors.grey150 },
  locationRow: {
    marginTop: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  locationPin: { fontSize: 15, marginRight: spacing.xs },
  locationText: { ...typography.captionRegular, color: colors.grey150 },
  locationStrong: { ...typography.captionSemiBold, color: colors.black },
  banner: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    height: 148,
    borderRadius: radius.xl,
    backgroundColor: '#55B8E7',
    overflow: 'hidden' as const,
    position: 'relative' as const,
  },
  bannerContent: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'center' as const,
    zIndex: 2,
  },
  discountBadge: {
    alignSelf: 'flex-start' as const,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: colors.black,
  },
  discountText: { ...typography.captionSemiBold, color: colors.white },
  bannerEyebrow: {
    ...typography.captionRegular,
    color: colors.white,
    marginTop: spacing.xs,
  },
  bannerTitle: {
    ...typography.heading2Bold,
    color: colors.white,
    fontSize: 24,
  },
  bannerEmoji: {
    position: 'absolute' as const,
    right: 18,
    top: 20,
    fontSize: 80,
  },
  bannerDots: {
    position: 'absolute' as const,
    right: spacing.lg,
    bottom: spacing.md,
    flexDirection: 'row' as const,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.92)',
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
  sectionTitle: { ...typography.heading3Bold, color: colors.black },
  seeAll: { ...typography.captionSemiBold, color: colors.cyan },
  categoryList: { paddingHorizontal: spacing.lg },
  categoryCard: {
    width: 76,
    height: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#EEF0F6',
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
    color: colors.black,
    fontSize: 9,
    textAlign: 'center' as const,
  },
  productGrid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
  },
  productCard: { width: '48.3%' as const, marginBottom: spacing.lg },
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
    backgroundColor: '#262626',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heartText: { color: colors.white, fontSize: 17 },
  colorRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginTop: spacing.sm,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.white,
    marginRight: -5,
    ...shadows.small,
  },
  dotDark: { backgroundColor: '#252525' },
  dotBlue: { backgroundColor: '#1F88DA' },
  dotGreen: { backgroundColor: colors.cyan },
  colorText: {
    ...typography.captionRegular,
    color: colors.grey150,
    textDecorationLine: 'underline' as const,
    marginLeft: spacing.sm,
  },
  productName: {
    ...typography.body2Regular,
    color: colors.black,
    marginTop: spacing.sm,
  },
  productPrice: { ...typography.body2Medium, color: colors.black },
  originalPrice: {
    ...typography.captionRegular,
    color: colors.grey100,
    textDecorationLine: 'line-through' as const,
  },
  loadingBox: {
    height: 100,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};

export default HomeScreen;

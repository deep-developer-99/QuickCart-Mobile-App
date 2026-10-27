import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useGetCategoriesQuery,
  useGetCartQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from '../../api/quickCartApi';
import CartAddedToast from '../../components/CartAddedToast';
import BackButton from '../../components/common/BackButton';
import CartQuantityControl from '../../components/CartQuantityControl';
import type { CartProduct } from '../../store/slices/cartSlice';
import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface Product extends CartProduct {
  category?: string | { _id: string; name: string };
}

type SortOption = 'priceLow' | 'priceHigh' | 'az' | 'za' | null;

const categoryEmoji: Record<string, string> = {
  electronics: '📱',
  fashion: '👜',
  furniture: '🛋️',
  industrial: '🚗',
  'home decor': '🎁',
  health: '🩺',
  'construction & real estate': '🏠',
  'construction & real state': '🏠',
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

const getProductCategory = (product: Product) => {
  if (!product.category) return { _id: '', name: '' };
  if (typeof product.category === 'string') {
    return { _id: product.category, name: product.category };
  }
  return product.category;
};

const CategoriesScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>(null);
  const [draftSort, setDraftSort] = useState<SortOption>(null);
  const [showCartToast, setShowCartToast] = useState(false);
  const cartToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: categoryResponse, isLoading: categoriesLoading } =
    useGetCategoriesQuery();
  const {
    currentData: productResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
    isError: productsError,
  } = useGetProductsQuery(
    selectedCategory ? { category: selectedCategory._id } : undefined,
  );

  const { data: wishlistResponse } = useGetWishlistQuery();
  const { data: cartResponse, isLoading: cartLoading } = useGetCartQuery();
  const cartItemByProductId = useMemo(() => {
    const items = cartResponse?.data?.items ?? [];
    return new Map(items.map(item => [item.product?._id, item]));
  }, [cartResponse]);
  const showAddedToast = () => {
    setShowCartToast(true);
    if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    cartToastTimeout.current = setTimeout(() => setShowCartToast(false), 2800);
  };
  const wishlistIds = useMemo(() => {
    const data = wishlistResponse?.data;
    const products = Array.isArray(data) ? data : data?.products ?? [];
    return products.map(item => item._id);
  }, [wishlistResponse]);

  const categories = useMemo<Category[]>(
    () => (Array.isArray(categoryResponse?.data) ? categoryResponse.data : []),
    [categoryResponse],
  );

  const routeCategoryId = route.params?.categoryId as string | undefined;

  useEffect(() => {
    if (!routeCategoryId) return;

    const category = categories.find(item => item._id === routeCategoryId);
    if (!category) return;

    setSelectedCategory(category);
    setSort(null);
    navigation.setParams({ categoryId: undefined });
  }, [categories, navigation, routeCategoryId]);

  useEffect(
    () => () => {
      if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    },
    [],
  );

  useFocusEffect(
    React.useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (searchOpen) {
            setSearchOpen(false);
            return true;
          }

          if (selectedCategory) {
            setSelectedCategory(null);
            setSearchText('');
            setSort(null);
            return true;
          }

          // Let React Navigation handle back when All Categories is active.
          return false;
        },
      );

      return () => subscription.remove();
    }, [searchOpen, selectedCategory]),
  );

  const products = useMemo<Product[]>(() => {
    if (!productResponse?.data) return [];
    return Array.isArray(productResponse.data) ? productResponse.data : [];
  }, [productResponse]);

  const visibleProducts = useMemo(() => {
    let result = [...products];

    if (selectedCategory) {
      result = result.filter(product => {
        const category = getProductCategory(product);
        const selectedName = selectedCategory.name.toLowerCase();
        return (
          category._id === selectedCategory._id ||
          category.name.toLowerCase() === selectedName
        );
      });
    }

    if (sort === 'priceLow') {
      result.sort(
        (a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price),
      );
    } else if (sort === 'priceHigh') {
      result.sort(
        (a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price),
      );
    } else if (sort === 'az') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'za') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }

    return result;
  }, [products, selectedCategory, sort]);

  const openFilter = () => {
    setDraftSort(sort);
    setFilterOpen(true);
  };

  if (searchOpen) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.searchHeader}>
            <Text style={styles.logoText}>QuickCart</Text>
            <Pressable onPress={() => setSearchOpen(false)}>
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>⌕</Text>
            <TextInput
              value={searchText}
              onChangeText={setSearchText}
              placeholder={t('ui.categories.searchPlaceholder')}
              placeholderTextColor={theme.colors.grey150}
              style={styles.searchInput}
              autoFocus
            />
            <Pressable onPress={openFilter}>
              <Text style={styles.filterIcon}>☷</Text>
            </Pressable>
          </View>

          <Text style={styles.recentTitle}>{t('ui.categories.recentSearches')}</Text>
          {[
            { label: t('ui.categories.suggestionWatch'), query: 'Smart watch' },
            { label: t('ui.categories.suggestionLaptop'), query: 'Laptop' },
            { label: t('ui.categories.suggestionBag'), query: 'Women bag' },
            { label: t('ui.categories.suggestionHeadphones'), query: 'Headphones' },
            { label: t('ui.categories.suggestionShoes'), query: 'Shoes' },
            { label: t('ui.categories.suggestionGlasses'), query: 'Eye glasses' },
          ].map(({ label, query }) => (
            <Pressable
              key={query}
              style={styles.recentRow}
              onPress={() => {
                setSearchText(query);
                setSearchOpen(false);
                setSelectedCategory(null);
              }}
            >
              <Text style={styles.recentText}>{label}</Text>
              <Text style={styles.recentArrow}>↖</Text>
            </Pressable>
          ))}

          <FilterModal
            visible={filterOpen}
            value={draftSort}
            onChange={setDraftSort}
            onClose={() => setFilterOpen(false)}
            onApply={() => {
              setSort(draftSort);
              setFilterOpen(false);
            }}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedCategory) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          <Header
            title={t('tabs.categories')}
            onBack={() => {
              if (navigation.canGoBack()) navigation.goBack();
            }}
          />
          {categoriesLoading ? (
            <View style={styles.center}>
              <ActivityIndicator />
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={styles.categoryGrid}
              showsVerticalScrollIndicator={false}
            >
              {categories.map(category => (
                <Pressable
                  key={category._id}
                  style={styles.categoryTile}
                  onPress={() => {
                    setSelectedCategory(category);
                    setSearchText('');
                    setSort(null);
                  }}
                >
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
                  <Text style={styles.categoryName} numberOfLines={2}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <Header
          title={selectedCategory.name}
          onBack={() => {
            setSelectedCategory(null);
            setSearchText('');
          }}
          right={
            <View style={styles.headerActions}>
              <Pressable
                onPress={() =>
                  navigation.navigate('Search', {
                    categoryId: selectedCategory._id,
                  })
                }
                hitSlop={8}
              >
                <Text style={styles.headerIcon}>⌕</Text>
              </Pressable>
              <Pressable onPress={openFilter} hitSlop={8}>
                <Text style={styles.headerIcon}>☷</Text>
              </Pressable>
            </View>
          }
        />

        {productsLoading || productsFetching ? (
          <View style={styles.center}>
            <ActivityIndicator />
          </View>
        ) : productsError ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t('ui.categories.loadErrorTitle')}</Text>
            <Text style={styles.emptyText}>{t('ui.categories.loadErrorDescription')}</Text>
          </View>
        ) : visibleProducts.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyTitle}>{t('ui.categories.emptyTitle')}</Text>
            <Text style={styles.emptyText}>
              {t('ui.categories.emptyDescription')}
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.productGrid}
          >
            {visibleProducts.map(product => {
              const price = product.discountPrice ?? product.price;
              const isWishlisted = wishlistIds.includes(product._id);

              return (
                <Pressable
                  key={product._id}
                  style={styles.productCard}
                  onPress={() =>
                    navigation.navigate('ProductDetails', {
                      product,
                    })
                  }
                >
                  <View style={styles.productImageWrap}>
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.productFallback}>
                        <Text style={styles.productEmoji}>
                          {productEmoji(product.name)}
                        </Text>
                      </View>
                    )}
                    <Pressable
                      style={styles.heartButton}
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
                      hitSlop={8}
                    >
                      <Text style={styles.heartText}>
                        {isWishlisted ? '♥' : '♡'}
                      </Text>
                    </Pressable>
                  </View>

                  <Text style={styles.productName} numberOfLines={1}>
                    {product.name}
                  </Text>
                  <Text style={styles.productPrice}>₹{price.toFixed(2)}</Text>
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
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <FilterModal
          visible={filterOpen}
          value={draftSort}
          onChange={setDraftSort}
          onClose={() => setFilterOpen(false)}
          onApply={() => {
            setSort(draftSort);
            setFilterOpen(false);
          }}
        />
        <CartAddedToast
          visible={showCartToast}
          onViewCart={() => navigation.navigate('MainTabs', { screen: 'Cart' })}
        />
      </View>
    </SafeAreaView>
  );
};

const Header = ({
  title,
  onBack,
  right,
}: {
  title: string;
  onBack: () => void;
  right?: React.ReactNode;
}) => {
  const styles = useStyles();

  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} hitSlop={10} />
      <Text style={styles.headerTitle} numberOfLines={1}>
        {title}
      </Text>
      {right ?? <View style={styles.headerSpacer} />}
    </View>
  );
};

const FilterModal = ({
  visible,
  value,
  onChange,
  onClose,
  onApply,
}: {
  visible: boolean;
  value: SortOption;
  onChange: (value: SortOption) => void;
  onClose: () => void;
  onApply: () => void;
}) => {
  const { t } = useTranslation();
  const styles = useStyles();
  const options: Array<{ key: SortOption; label: string }> = [
    { key: 'priceLow', label: t('ui.categories.sortPriceLow') },
    { key: 'priceHigh', label: t('ui.categories.sortPriceHigh') },
    { key: 'az', label: t('ui.categories.sortAZ') },
    { key: 'za', label: t('ui.categories.sortZA') },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.filterTitle}>{t('ui.categories.filterTitle')}</Text>

          {options.map(option => {
            const checked = value === option.key;
            return (
              <Pressable
                key={option.key}
                style={styles.filterRow}
                onPress={() => onChange(option.key)}
              >
                <View
                  style={[styles.checkbox, checked && styles.checkboxChecked]}
                >
                  {checked ? <Text style={styles.checkmark}>✓</Text> : null}
                </View>
                <Text style={styles.filterLabel}>{option.label}</Text>
              </Pressable>
            );
          })}

          <Pressable style={styles.applyButton} onPress={onApply}>
            <Text style={styles.applyText}>{t('ui.categories.apply')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 60,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
    },
    backIcon: { fontSize: 28, lineHeight: 34, color: colors.text, width: 40 },
    headerTitle: { ...typography.body1Regular, color: colors.text, flex: 1 },
    headerSpacer: { width: 60 },
    headerActions: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      gap: spacing.lg,
    },
    headerIcon: { fontSize: 29, color: colors.text },
    categoryGrid: {
      padding: spacing.lg,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
      paddingBottom: 90,
    },
    categoryTile: {
      width: '48.5%' as const,
      height: 100,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: radius.lg,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginBottom: spacing.md,
    },
    categoryImage: { width: 44, height: 44, marginBottom: spacing.xs },
    categoryEmoji: { fontSize: 30, marginBottom: spacing.xs },
    categoryName: {
      ...typography.body2Regular,
      color: colors.text,
      textAlign: 'center' as const,
      paddingHorizontal: spacing.sm,
    },
    center: {
      flex: 1,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      padding: spacing.xxl,
    },
    emptyTitle: { ...typography.heading3Bold, color: colors.text },
    emptyText: {
      ...typography.body2Regular,
      color: colors.secondaryText,
      marginTop: spacing.xs,
    },
    productGrid: {
      padding: spacing.lg,
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      justifyContent: 'space-between' as const,
      paddingBottom: 90,
    },
    productCard: {
      width: '48.2%' as const,
      height: 252,
      marginBottom: spacing.lg,
    },
    productImageWrap: {
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
    productEmoji: { fontSize: 52 },
    heartButton: {
      position: 'absolute' as const,
      top: 7,
      right: 7,
      width: 27,
      height: 27,
      borderRadius: radius.pill,
      backgroundColor: colors.black,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    heartText: { color: colors.white, fontSize: 17 },

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
    searchHeader: {
      height: 60,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
    },
    logoText: { ...typography.heading3Bold, color: colors.text },
    closeText: { fontSize: 32, color: colors.text },
    searchBox: {
      marginHorizontal: spacing.lg,
      height: 56,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: radius.md,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.md,
    },
    searchIcon: { fontSize: 28, color: colors.secondaryText },
    searchInput: {
      ...typography.body2Regular,
      flex: 1,
      color: colors.text,
      marginHorizontal: spacing.sm,
    },
    filterIcon: { fontSize: 26, color: colors.secondaryText },
    recentTitle: {
      ...typography.captionSemiBold,
      color: colors.text,
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    recentRow: {
      height: 49,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between',
    },
    recentText: { ...typography.body2Regular, color: colors.text },
    recentArrow: { fontSize: 24, color: colors.grey100 },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.48)',
    },
    modalDismiss: { flex: 1 },
    filterSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      paddingBottom: 24,
    },
    sheetHandle: {
      width: 64,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.grey50,
      alignSelf: 'center',
      marginTop: spacing.sm,
    },
    filterTitle: {
      ...typography.body1Medium,
      color: colors.text,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.lg,
      paddingBottom: spacing.sm,
    },
    filterRow: {
      height: 56,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 7,
      borderWidth: 2,
      borderColor: colors.text,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      marginRight: spacing.md,
    },
    checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
    checkmark: { color: colors.white, fontSize: 18, fontWeight: '700' },
    filterLabel: { ...typography.body2Regular, color: colors.text },
    applyButton: {
      height: 60,
      marginHorizontal: spacing.lg,
      marginTop: spacing.xl,
      borderRadius: radius.md,
      backgroundColor: colors.black,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    },
    applyText: { ...typography.body2Medium, color: colors.white },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default CategoriesScreen;

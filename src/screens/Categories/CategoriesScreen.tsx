import { AppText as Text, AppTextInput as TextInput } from '../../components/AppText';
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
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  View,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import {
  useGetCategoriesQuery,
  useGetSubcategoriesQuery,
  useLazyGetProductsQuery,
} from '../../api/quickCartApi';
import type { RootState } from '../../store/store';
import { hasVariantDiscount, lowestPricedVariant, variantDiscountPercentage, variantSellingPrice } from '../../utils/variantPricing';
import CartAddedToast from '../../components/CartAddedToast';
import BackButton from '../../components/common/BackButton';
import CartQuantityControl from '../../components/CartQuantityControl';
import WishlistHeartButton from '../../components/WishlistHeartButton';
import QuickCartWordmark from '../../components/QuickCartWordmark';
import type { CartProduct } from '../../store/slices/cartSlice';
import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import type { Subcategory } from '../../api/quickCartApi';
import { appendUniqueProducts, buildCategoryProductQuery, CATEGORY_PRODUCT_PAGE_SIZE } from '../../utils/categoryBrowsing';

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface Product extends CartProduct {
  category?: string | { _id: string; name: string };
  subCategory?: string | { _id: string; name: string; image?: string };
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

const CategoriesScreen = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useStyles();
  const { width: windowWidth } = useWindowDimensions();
  const sidebarWidth = windowWidth * 0.24;
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>(null);
  const [draftSort, setDraftSort] = useState<SortOption>(null);
  const [showCartToast, setShowCartToast] = useState(false);
  const cartToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const productsListRef = useRef<FlatList<Product>>(null);
  const productRequestId = useRef(0);
  const activeProductRequest = useRef<{ abort?: () => void } | null>(null);
  const pageRequestLock = useRef(false);
  const [pageProducts, setPageProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [productsError, setProductsError] = useState(false);
  const [productRetryCount, setProductRetryCount] = useState(0);

  const { data: categoryResponse, isLoading: categoriesLoading } =
    useGetCategoriesQuery();
  const {
    currentData: subcategoryResponse,
    isFetching: subcategoriesFetching,
    isError: subcategoriesError,
    refetch: refetchSubcategories,
  } = useGetSubcategoriesQuery(selectedCategory?._id ?? '', {
    skip: !selectedCategory,
    refetchOnMountOrArgChange: 30,
  });
  const [fetchProducts] = useLazyGetProductsQuery();

  const cartLoading = useSelector((state: RootState) => Boolean(state.auth.user?.id && state.cart.hydratedForUserId !== state.auth.user.id));
  const showAddedToast = () => {
    setShowCartToast(true);
    if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    cartToastTimeout.current = setTimeout(() => setShowCartToast(false), 2800);
  };

  const categories = useMemo<Category[]>(
    () => (Array.isArray(categoryResponse?.data) ? categoryResponse.data : []),
    [categoryResponse],
  );
  const subcategories = useMemo<Subcategory[]>(
    () => Array.isArray(subcategoryResponse?.data) ? subcategoryResponse.data : [],
    [subcategoryResponse],
  );
  const selectedSubcategory = subcategories.find(
    item => item._id === selectedSubcategoryId,
  ) ?? null;
  const selectedCategoryId = selectedCategory?._id;
  const selectedSubcategoryQueryId = selectedSubcategory?._id;
  const productQueryReady = Boolean(
    selectedCategory &&
    !subcategoriesFetching &&
    !subcategoriesError &&
    (subcategories.length === 0 || selectedSubcategory),
  );
  const productRequestKey = selectedCategory
    ? `${selectedCategory._id}:${selectedSubcategory?._id ?? 'all'}:${sort ?? 'default'}`
    : '';

  const routeCategoryId = route.params?.categoryId as string | undefined;

  useEffect(() => {
    if (!routeCategoryId) return;

    const category = categories.find(item => item._id === routeCategoryId);
    if (!category) return;

    setSelectedCategory(category);
    setSelectedSubcategoryId(null);
    setSort(null);
    navigation.setParams({ categoryId: undefined });
  }, [categories, navigation, routeCategoryId]);

  useEffect(() => {
    if (!selectedCategory || subcategoriesFetching || subcategoriesError) return;
    setSelectedSubcategoryId(current =>
      current && subcategories.some(item => item._id === current)
        ? current
        : subcategories[0]?._id ?? null,
    );
  }, [selectedCategory, subcategories, subcategoriesError, subcategoriesFetching]);

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
            setSelectedSubcategoryId(null);
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

  const [loadedProductKey, setLoadedProductKey] = useState('');

  useEffect(() => {
    productsListRef.current?.scrollToOffset({ offset: 0, animated: false });
    pageRequestLock.current = false;
    activeProductRequest.current?.abort?.();
    const requestId = ++productRequestId.current;
    setPageProducts([]);
    setPage(0);
    setHasNextPage(false);
    setLoadingMore(false);
    setProductsError(false);
    setLoadedProductKey('');

    if (!selectedCategoryId) {
      setProductsLoading(false);
      return undefined;
    }
    if (!productQueryReady) {
      setProductsLoading(!subcategoriesError);
      return undefined;
    }

    setProductsLoading(true);
    const request = fetchProducts(
      buildCategoryProductQuery(selectedCategoryId, selectedSubcategoryQueryId, 1, sort),
      true,
    );
    activeProductRequest.current = request;

    request.unwrap().then(response => {
      if (requestId !== productRequestId.current) return;
      const rows = Array.isArray(response?.data) ? response.data as Product[] : [];
      setPageProducts(rows);
      setPage(response?.pagination?.currentPage ?? 1);
      setHasNextPage(response?.pagination?.hasNextPage ?? rows.length === CATEGORY_PRODUCT_PAGE_SIZE);
      setLoadedProductKey(productRequestKey);
    }).catch(() => {
      if (requestId !== productRequestId.current) return;
      setProductsError(true);
      setLoadedProductKey(productRequestKey);
    }).finally(() => {
      if (requestId === productRequestId.current) setProductsLoading(false);
    });

    return () => {
      request.abort();
      if (requestId === productRequestId.current) productRequestId.current += 1;
    };
  }, [fetchProducts, productQueryReady, productRequestKey, productRetryCount, selectedCategoryId, selectedSubcategoryQueryId, sort, subcategoriesError]);

  const loadNextPage = React.useCallback(() => {
    if (!productQueryReady || !selectedCategoryId || !hasNextPage || productsLoading || loadingMore || pageRequestLock.current) return;
    pageRequestLock.current = true;
    setLoadingMore(true);
    const requestId = productRequestId.current;
    const requestKey = productRequestKey;
    const request = fetchProducts(
      buildCategoryProductQuery(selectedCategoryId, selectedSubcategoryQueryId, page + 1, sort),
      true,
    );
    activeProductRequest.current = request;
    request.unwrap().then(response => {
      if (requestId !== productRequestId.current || requestKey !== productRequestKey) return;
      const incoming = Array.isArray(response?.data) ? response.data as Product[] : [];
      setPageProducts(current => {
        return appendUniqueProducts(current, incoming);
      });
      setPage(response?.pagination?.currentPage ?? page + 1);
      setHasNextPage(response?.pagination?.hasNextPage ?? incoming.length === CATEGORY_PRODUCT_PAGE_SIZE);
    }).catch(() => {
      if (requestId === productRequestId.current && requestKey === productRequestKey) setProductsError(true);
    }).finally(() => {
      if (requestId === productRequestId.current && requestKey === productRequestKey) {
        pageRequestLock.current = false;
        setLoadingMore(false);
      }
    });
  }, [fetchProducts, hasNextPage, loadingMore, page, productQueryReady, productRequestKey, productsLoading, selectedCategoryId, selectedSubcategoryQueryId, sort]);

  const retryProductLoad = () => {
    setProductsError(false);
    if (pageProducts.length === 0) setProductRetryCount(value => value + 1);
    else loadNextPage();
  };

  const openFilter = () => {
    setDraftSort(sort);
    setFilterOpen(true);
  };

  if (searchOpen) {
    return (
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.container}>
          <View style={styles.searchHeader}>
            <QuickCartWordmark
              textStyle={styles.logoText}
              markSize={28}
              gap={3}
            />
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
            <View style={styles.categoryGrid}>
              {Array.from({ length: 6 }, (_, index) => <View key={index} style={styles.categoryTileSkeleton} />)}
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
                    setSelectedSubcategoryId(null);
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
            setSelectedSubcategoryId(null);
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
            </View>
          }
        />

        <View style={styles.browseLayout}>
          <View style={[styles.subcategorySidebar, { width: sidebarWidth }]}>
            {subcategoriesFetching ? (
              <View style={styles.subcategorySkeletonList}>
                {[0, 1, 2, 3].map(index => <View key={index} style={styles.subcategorySkeletonItem}><View style={styles.subcategorySkeletonImage} /><View style={styles.subcategorySkeletonLabel} /></View>)}
              </View>
            ) : subcategoriesError ? (
              <View style={styles.subcategoryMessage}>
                <Text style={styles.subcategoryMessageText}>{t('ui.categories.loadErrorTitle')}</Text>
                <Pressable onPress={() => refetchSubcategories()} accessibilityRole="button">
                  <Text style={styles.retryText}>{t('ui.categories.retry')}</Text>
                </Pressable>
              </View>
            ) : subcategories.length > 0 ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.subcategoryList}>
                {subcategories.map(subcategory => {
                  const selected = selectedSubcategoryId === subcategory._id;
                  return (
                    <Pressable
                      key={subcategory._id}
                      style={[styles.subcategoryItem, selected && styles.subcategoryItemSelected]}
                      onPress={() => {
                        if (selected) return;
                        setSelectedSubcategoryId(subcategory._id);
                        productsListRef.current?.scrollToOffset({ offset: 0, animated: false });
                      }}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                    >
                      {subcategory.image ? (
                        <Image source={{ uri: subcategory.image }} style={styles.subcategoryImage} resizeMode="cover" />
                      ) : (
                        <View style={styles.subcategoryImageFallback}><Text style={styles.subcategoryFallbackEmoji}>🛍️</Text></View>
                      )}
                      <Text style={[styles.subcategoryName, selected && styles.subcategoryNameSelected]} numberOfLines={2}>{subcategory.name}</Text>
                      {selected ? <View style={styles.subcategorySelectedIndicator} /> : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.subcategoryMessage}>
                <Text style={styles.subcategoryMessageText}>{t('ui.categories.noSubcategories')}</Text>
              </View>
            )}
          </View>

          <View style={styles.productsColumn}>
            <View style={styles.productsToolbar}>
              <Text style={styles.productsToolbarTitle} numberOfLines={1}>{selectedSubcategory?.name ?? selectedCategory.name}</Text>
              <Pressable style={styles.sortButton} onPress={openFilter} accessibilityRole="button">
                <Text style={styles.sortButtonText}>{sort ? t(`ui.categories.sort${sort === 'priceLow' ? 'PriceLow' : sort === 'priceHigh' ? 'PriceHigh' : sort === 'az' ? 'AZ' : 'ZA'}`) : t('ui.categories.sort')}</Text>
                <Text style={styles.sortButtonIcon}>⌄</Text>
              </Pressable>
            </View>
            <FlatList
              ref={productsListRef}
              style={styles.productsList}
              data={loadedProductKey === productRequestKey ? pageProducts : []}
              keyExtractor={product => product._id}
              numColumns={2}
              columnWrapperStyle={styles.productGridRow}
              contentContainerStyle={[styles.productGrid, pageProducts.length === 0 && styles.emptyProductList]}
              showsVerticalScrollIndicator={false}
              onEndReached={loadNextPage}
              onEndReachedThreshold={0.45}
              ListEmptyComponent={
                subcategoriesError ? (
                  <View style={styles.productsState}>
                    <Text style={styles.emptyTitle}>{t('ui.categories.loadErrorTitle')}</Text>
                    <Text style={styles.emptyText}>{t('ui.categories.loadErrorDescription')}</Text>
                    <Pressable style={styles.retryButton} onPress={() => refetchSubcategories()}><Text style={styles.retryButtonText}>{t('ui.categories.retry')}</Text></Pressable>
                  </View>
                ) : !productQueryReady || productsLoading || loadedProductKey !== productRequestKey ? (
                  <View style={styles.productsState}><ActivityIndicator color={theme.colors.cyan} /></View>
                ) : productsError ? (
                  <View style={styles.productsState}>
                    <Text style={styles.emptyTitle}>{t('ui.categories.loadErrorTitle')}</Text>
                    <Text style={styles.emptyText}>{t('ui.categories.loadErrorDescription')}</Text>
                    <Pressable style={styles.retryButton} onPress={retryProductLoad}><Text style={styles.retryButtonText}>{t('ui.categories.retry')}</Text></Pressable>
                  </View>
                ) : (
                  <View style={styles.productsState}>
                    <Text style={styles.emptyTitle}>{t('ui.categories.emptyTitle')}</Text>
                    <Text style={styles.emptyText}>{t('ui.categories.emptyDescription')}</Text>
                  </View>
                )
              }
              ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.listFooter} color={theme.colors.cyan} /> : productsError && pageProducts.length > 0 ? <Pressable onPress={retryProductLoad} style={styles.listFooter}><Text style={styles.retryText}>{t('ui.categories.retry')}</Text></Pressable> : undefined}
              renderItem={({ item: product }) => {
                const cardVariant = lowestPricedVariant(product.variants);
                const price = variantSellingPrice(cardVariant);
                return (
                  <View style={styles.productCard}>
                    <View style={styles.productImageWrap}>
                      <Pressable
                        style={styles.productImagePressable}
                        onPress={() => navigation.navigate('ProductDetails', { product })}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${product.name}`}
                      >
                        {product.image ? <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="contain" /> : <View style={styles.productFallback}><Text style={styles.productEmoji}>{productEmoji(product.name)}</Text></View>}
                      </Pressable>
                      <WishlistHeartButton
                        product={product}
                        buttonStyle={styles.heartButton}
                        heartStyle={styles.heartText}
                        addLabel={t('ui.product.addToWishlist', { name: product.name })}
                        removeLabel={t('ui.common.removeFromWishlist', { name: product.name })}
                      />
                    </View>
                    <Pressable
                      onPress={() => navigation.navigate('ProductDetails', { product })}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${product.name}`}
                    >
                      <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                      <Text style={styles.productUnit} numberOfLines={1}>{cardVariant ? `${cardVariant.quantity} ${cardVariant.unit}` : ' '}</Text>
                      <Text style={styles.productPrice} numberOfLines={1}>{cardVariant ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ' '}</Text>
                      <View style={styles.discountRow}>
                        {hasVariantDiscount(cardVariant) ? <><Text style={styles.originalPrice} numberOfLines={1}>₹{cardVariant.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text><Text style={styles.productDiscount}>{variantDiscountPercentage(cardVariant)}% off</Text></> : null}
                      </View>
                    </Pressable>
                    <View style={styles.cartControl}>
                      <CartQuantityControl productId={product._id} productName={product.name} productImage={product.image} stock={cardVariant?.stock} variants={product.variants} disabled={cartLoading} compact onAdded={showAddedToast} />
                    </View>
                  </View>
                );
              }}
            />
          </View>
        </View>

        <FilterModal
          visible={filterOpen}
          value={draftSort}
          onChange={setDraftSort}
          onClose={() => setFilterOpen(false)}
          onApply={() => {
            setSort(draftSort);
            productsListRef.current?.scrollToOffset({ offset: 0, animated: false });
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
    browseLayout: { flex: 1, flexDirection: 'row' as const, minHeight: 0 },
    subcategorySidebar: {
      flex: 0,
      backgroundColor: colors.surface,
      borderRightWidth: 1,
      borderRightColor: colors.grey50,
    },
    subcategoryList: { paddingBottom: spacing.xl },
    subcategoryItem: {
      minHeight: 104,
      paddingHorizontal: spacing.xs,
      paddingVertical: spacing.sm,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      position: 'relative' as const,
    },
    subcategoryItemSelected: { backgroundColor: colors.cyan50 },
    subcategoryImage: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      backgroundColor: colors.grey50,
    },
    subcategoryImageFallback: {
      width: 52,
      height: 52,
      borderRadius: radius.pill,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      backgroundColor: colors.grey50,
    },
    subcategoryFallbackEmoji: { fontSize: 25 },
    subcategoryName: {
      ...typography.captionRegular,
      color: colors.text,
      textAlign: 'center' as const,
      marginTop: spacing.xs,
      lineHeight: 14,
    },
    subcategoryNameSelected: { ...typography.captionSemiBold, color: colors.text },
    subcategorySelectedIndicator: {
      position: 'absolute' as const,
      right: 0,
      top: 18,
      bottom: 18,
      width: 4,
      borderTopLeftRadius: radius.pill,
      borderBottomLeftRadius: radius.pill,
      backgroundColor: '#168B43',
    },
    subcategorySkeletonList: { padding: spacing.sm, gap: spacing.lg },
    subcategorySkeletonItem: { alignItems: 'center' as const, gap: spacing.xs },
    subcategorySkeletonImage: { width: 48, height: 48, borderRadius: radius.pill, backgroundColor: colors.grey50 },
    subcategorySkeletonLabel: { width: 48, height: 10, borderRadius: radius.sm, backgroundColor: colors.grey50 },
    subcategoryMessage: { flex: 1, alignItems: 'center' as const, justifyContent: 'center' as const, padding: spacing.xs },
    subcategoryMessageText: { ...typography.overlineRegular, color: colors.secondaryText, textAlign: 'center' as const },
    retryText: { ...typography.captionSemiBold, color: colors.cyan, textAlign: 'center' as const, marginTop: spacing.xs },
    productsColumn: { flex: 1, minWidth: 0, backgroundColor: colors.background },
    productsList: { flex: 1, minHeight: 0 },
    productsToolbar: {
      minHeight: 48,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      gap: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
    },
    productsToolbarTitle: { ...typography.body2Medium, color: colors.text, flex: 1, minWidth: 0 },
    sortButton: {
      maxWidth: '52%',
      minHeight: 34,
      paddingHorizontal: spacing.sm,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.grey50,
      backgroundColor: colors.surface,
    },
    sortButtonText: { ...typography.captionRegular, color: colors.text, flexShrink: 1 },
    sortButtonIcon: { marginLeft: spacing.xs, color: colors.secondaryText, fontSize: 16 },
    retryButton: { marginTop: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.cyan },
    retryButtonText: { ...typography.body2Medium, color: colors.white },
    productsState: { flex: 1, minHeight: 180, alignItems: 'center' as const, justifyContent: 'center' as const, padding: spacing.md },
    emptyProductList: { flexGrow: 1 },
    listFooter: { alignSelf: 'center' as const, marginVertical: spacing.lg, padding: spacing.sm },
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
    categoryTileSkeleton: {
      width: '48.5%' as const,
      height: 100,
      borderRadius: radius.lg,
      marginBottom: spacing.md,
      backgroundColor: colors.grey50,
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
      flexGrow: 1,
      padding: spacing.sm,
      paddingBottom: spacing.xl,
    },
    productGridRow: { justifyContent: 'space-between' as const, alignItems: 'stretch' as const, gap: spacing.sm },
    productCard: {
      width: '48%' as const,
      minWidth: 0,
      marginBottom: spacing.sm,
      padding: spacing.xs,
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.grey50,
    },
    productImageWrap: {
      width: '100%',
      aspectRatio: 1.08,
      borderRadius: radius.xl,
      overflow: 'hidden' as const,
      backgroundColor: colors.grey50,
      position: 'relative' as const,
    },
    productImagePressable: { flex: 1 },
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
      minHeight: 34,
      lineHeight: 17,
      flexShrink: 1,
    },
    productUnit: { ...typography.captionRegular, color: colors.secondaryText, minHeight: 16 },
    productPrice: { ...typography.body2Medium, color: colors.text, minHeight: 20 },
    originalPrice: {
      ...typography.captionRegular,
      color: colors.grey100,
      textDecorationLine: 'line-through' as const,
      flexShrink: 1,
    },
    discountRow: { minHeight: 18, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
    productDiscount: { ...typography.captionRegular, color: '#168BCE', fontSize: 9, flexShrink: 1 },
    cartControl: {
      minHeight: 52,
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

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import {
  useGetCategoriesQuery,
  useGetProductsQuery,
  useAddToCartMutation,
} from '../../api/quickCartApi';
import type { CartProduct } from '../../store/slices/cartSlice';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { colors, radius, spacing, typography } from '../../theme';

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
  const dispatch = useDispatch<AppDispatch>();
  const [addToCart] = useAddToCartMutation();
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterOpen, setFilterOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>(null);
  const [draftSort, setDraftSort] = useState<SortOption>(null);

  const { data: categoryResponse, isLoading: categoriesLoading } =
    useGetCategoriesQuery();
  const { data: productResponse, isLoading: productsLoading } =
    useGetProductsQuery(undefined);

  const wishlistIds = useSelector((state: RootState) =>
    state.wishlist.items.map(item => item._id),
  );

  const categories = useMemo<Category[]>(
    () => (Array.isArray(categoryResponse?.data) ? categoryResponse.data : []),
    [categoryResponse],
  );

  const products = useMemo<Product[]>(
    () => (Array.isArray(productResponse?.data) ? productResponse.data : []),
    [productResponse],
  );

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

    const query = searchText.trim().toLowerCase();
    if (query) {
      result = result.filter(product =>
        product.name.toLowerCase().includes(query),
      );
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
  }, [products, selectedCategory, searchText, sort]);

  const openFilter = () => {
    setDraftSort(sort);
    setFilterOpen(true);
  };

  if (searchOpen) {
    return (
      <View style={styles.container}>
        <View style={styles.searchHeader}>
          <Text style={styles.logoText}>QuickMart</Text>
          <Pressable onPress={() => setSearchOpen(false)}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Search"
            placeholderTextColor={colors.grey150}
            style={styles.searchInput}
            autoFocus
          />
          <Pressable onPress={openFilter}>
            <Text style={styles.filterIcon}>☷</Text>
          </Pressable>
        </View>

        <Text style={styles.recentTitle}>RECENT SEARCH</Text>
        {[
          'Smart watch',
          'Laptop',
          'Women bag',
          'Headphones',
          'Shoes',
          'Eye glasses',
        ].map(item => (
          <Pressable
            key={item}
            style={styles.recentRow}
            onPress={() => {
              setSearchText(item);
              setSearchOpen(false);
              setSelectedCategory(null);
            }}
          >
            <Text style={styles.recentText}>{item}</Text>
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
    );
  }

  if (!selectedCategory) {
    return (
      <View style={styles.container}>
        <Header title="Categories" onBack={() => {}} />
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
    );
  }

  return (
    <View style={styles.container}>
      <Header
        title={selectedCategory.name}
        onBack={() => {
          setSelectedCategory(null);
          setSearchText('');
        }}
        right={
          <View style={styles.headerActions}>
            <Pressable onPress={() => setSearchOpen(true)} hitSlop={8}>
              <Text style={styles.headerIcon}>⌕</Text>
            </Pressable>
            <Pressable onPress={openFilter} hitSlop={8}>
              <Text style={styles.headerIcon}>☷</Text>
            </Pressable>
          </View>
        }
      />

      {productsLoading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : visibleProducts.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>Try another category or search.</Text>
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
                onPress={async () => {
                  try {
                    await addToCart({
                      productId: product._id,
                      quantity: 1,
                    }).unwrap();
                  } catch (error) {
                    console.error('Failed to add product to cart:', error);
                  }
                }}
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
                    onPress={() => dispatch(toggleWishlist(product))}
                    hitSlop={8}
                  >
                    <Text style={styles.heartText}>
                      {isWishlisted ? '♥' : '♡'}
                    </Text>
                  </Pressable>
                </View>

                <View style={styles.colorRow}>
                  <View style={[styles.colorDot, styles.colorDotDark]} />
                  <View style={[styles.colorDot, styles.colorDotBlue]} />
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: colors.grey100 },
                    ]}
                  />
                  <Text style={styles.colorText}>All 5 Colors</Text>
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
    </View>
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
}) => (
  <View style={styles.header}>
    <Pressable onPress={onBack} hitSlop={10}>
      <Text style={styles.backIcon}>‹</Text>
    </Pressable>
    <Text style={styles.headerTitle} numberOfLines={1}>
      {title}
    </Text>
    {right ?? <View style={styles.headerSpacer} />}
  </View>
);

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
  const options: Array<{ key: SortOption; label: string }> = [
    { key: 'priceLow', label: 'Price (Low to High)' },
    { key: 'priceHigh', label: 'Price (High to Low)' },
    { key: 'az', label: 'A-Z' },
    { key: 'za', label: 'Z-A' },
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
          <Text style={styles.filterTitle}>Filter</Text>

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
            <Text style={styles.applyText}>Apply</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 60,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  backIcon: { fontSize: 38, lineHeight: 38, color: colors.black, width: 35 },
  headerTitle: { ...typography.body1Regular, color: colors.black, flex: 1 },
  headerSpacer: { width: 60 },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.lg,
  },
  headerIcon: { fontSize: 29, color: colors.black },
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
    borderColor: '#EEF0F8',
    borderRadius: radius.lg,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.md,
  },
  categoryImage: { width: 44, height: 44, marginBottom: spacing.xs },
  categoryEmoji: { fontSize: 30, marginBottom: spacing.xs },
  categoryName: {
    ...typography.body2Regular,
    color: colors.black,
    textAlign: 'center' as const,
    paddingHorizontal: spacing.sm,
  },
  center: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    padding: spacing.xxl,
  },
  emptyTitle: { ...typography.heading3Bold, color: colors.black },
  emptyText: {
    ...typography.body2Regular,
    color: colors.grey150,
    marginTop: spacing.xs,
  },
  productGrid: {
    padding: spacing.lg,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
    paddingBottom: 90,
  },
  productCard: { width: '48.2%' as const, marginBottom: spacing.lg },
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
    backgroundColor: '#1D1D1D',
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
  },
  colorDotDark: { backgroundColor: '#252525' },
  colorDotBlue: { backgroundColor: '#1F88DA' },
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
  searchHeader: {
    height: 60,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  logoText: { ...typography.heading3Bold, color: colors.black },
  closeText: { fontSize: 32, color: colors.black },
  searchBox: {
    marginHorizontal: spacing.lg,
    height: 56,
    borderWidth: 1,
    borderColor: '#EEF0F8',
    borderRadius: radius.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.md,
  },
  searchIcon: { fontSize: 28, color: colors.grey150 },
  searchInput: {
    ...typography.body2Regular,
    flex: 1,
    color: colors.black,
    marginHorizontal: spacing.sm,
  },
  filterIcon: { fontSize: 26, color: colors.grey150 },
  recentTitle: {
    ...typography.captionSemiBold,
    color: colors.black,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  recentRow: {
    height: 49,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F8',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between',
  },
  recentText: { ...typography.body2Regular, color: colors.black },
  recentArrow: { fontSize: 24, color: colors.grey100 },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.48)',
  },
  modalDismiss: { flex: 1 },
  filterSheet: {
    backgroundColor: colors.white,
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
    color: colors.black,
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
    borderBottomColor: '#EEF0F8',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.black,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.md,
  },
  checkboxChecked: { backgroundColor: colors.blue, borderColor: colors.blue },
  checkmark: { color: colors.white, fontSize: 18, fontWeight: '700' },
  filterLabel: { ...typography.body2Regular, color: colors.black },
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

export default CategoriesScreen;

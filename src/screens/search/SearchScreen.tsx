import { AppText as Text, AppTextInput as TextInput } from '../../components/AppText';
import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useNavigation, useRoute } from '@react-navigation/native';
import {
  useGetCategoriesQuery,
  useGetProductsQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  type ProductResponse,
} from '../../api/quickCartApi';
import { radius, spacing, typography, useTheme } from '../../theme';
import QuickCartWordmark from '../../components/QuickCartWordmark';
import type { ThemeColors } from '../../theme';

type Product = ProductResponse['data'][number];
type SortOption = 'priceLow' | 'priceHigh' | 'rating' | null;
type ProductFilters = {
  categoryId: string | null;
  minPrice: string;
  maxPrice: string;
  inStock: boolean;
  sort: SortOption;
};

const emptyFilters: ProductFilters = {
  categoryId: null,
  minPrice: '',
  maxPrice: '',
  inStock: false,
  sort: null,
};

const RECENT_SEARCHES_KEY = '@quickcart_recent_searches';
const MAX_RECENT_SEARCHES = 7;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildBackendSearch = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean).map(escapeRegExp);

  return words.join('.*');
};

const productEmoji = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('watch')) return '⌚';
  if (value.includes('headphone')) return '🎧';
  if (value.includes('phone')) return '📱';
  if (value.includes('laptop')) return '💻';
  if (value.includes('shoe')) return '👟';
  if (value.includes('glass')) return '👓';
  if (value.includes('bag')) return '👜';
  return '🛍️';
};

const SearchScreen = () => {
  const { t } = useTranslation();
  const styles = useStyles();
  const { theme } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const initialCategoryId = route.params?.categoryId as string | undefined;
  const scopedFilters = useMemo<ProductFilters>(
    () => ({ ...emptyFilters, categoryId: initialCategoryId ?? null }),
    [initialCategoryId],
  );
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentSearchesLoaded, setRecentSearchesLoaded] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>(scopedFilters);
  const [draftFilters, setDraftFilters] = useState<ProductFilters>(scopedFilters);

  const { data: categoryResponse } = useGetCategoriesQuery();
  const categories = useMemo(
    () => (Array.isArray(categoryResponse?.data) ? categoryResponse.data : []),
    [categoryResponse],
  );

  const { data: wishlistResponse } = useGetWishlistQuery();
  const wishlistIds = useMemo(() => {
    const data = wishlistResponse?.data;
    const products = Array.isArray(data) ? data : data?.products ?? [];
    return products.map(item => item._id);
  }, [wishlistResponse]);

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);

        if (stored) {
          const parsed = JSON.parse(stored);

          if (Array.isArray(parsed)) {
            setRecentSearches(
              parsed
                .filter((item): item is string => typeof item === 'string')
                .slice(0, MAX_RECENT_SEARCHES),
            );
          }
        }
      } catch (error) {
        console.log('Failed to load recent searches:', error);
      } finally {
        setRecentSearchesLoaded(true);
      }
    };

    loadRecentSearches();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const backendSearch = useMemo(
    () => buildBackendSearch(debouncedSearch),
    [debouncedSearch],
  );
  const hasActiveFilters =
    Boolean(filters.categoryId) ||
    filters.minPrice.trim() !== '' ||
    filters.maxPrice.trim() !== '' ||
    filters.inStock ||
    filters.sort !== null;

  const {
    data: productResponse,
    isFetching,
    isError,
  } = useGetProductsQuery(
    {
      search: backendSearch || undefined,
      category: filters.categoryId || undefined,
    },
    { skip: !backendSearch && !hasActiveFilters },
  );

  const products = useMemo<Product[]>(() => {
    if (!Array.isArray(productResponse?.data)) return [];

    const minPrice = Number(filters.minPrice);
    const maxPrice = Number(filters.maxPrice);
    const hasMinPrice = filters.minPrice.trim() !== '' && Number.isFinite(minPrice);
    const hasMaxPrice = filters.maxPrice.trim() !== '' && Number.isFinite(maxPrice);

    const result = productResponse.data.filter(product => {
      const price = product.discountPrice ?? product.price;
      const category = typeof product.category === 'string'
        ? product.category
        : product.category?._id;

      return (
        (!filters.categoryId || category === filters.categoryId) &&
        (!hasMinPrice || price >= minPrice) &&
        (!hasMaxPrice || price <= maxPrice) &&
        (!filters.inStock || product.stock > 0)
      );
    });

    if (filters.sort === 'priceLow') {
      result.sort((a, b) => (a.discountPrice ?? a.price) - (b.discountPrice ?? b.price));
    } else if (filters.sort === 'priceHigh') {
      result.sort((a, b) => (b.discountPrice ?? b.price) - (a.discountPrice ?? a.price));
    } else if (filters.sort === 'rating') {
      result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    }

    return result;
  }, [filters, productResponse]);

  const saveRecentSearch = async (value: string) => {
    const cleaned = value.trim();
    if (!cleaned) return;

    const updatedSearches = [
      cleaned,
      ...recentSearches.filter(
        item => item.toLowerCase() !== cleaned.toLowerCase(),
      ),
    ].slice(0, MAX_RECENT_SEARCHES);

    setRecentSearches(updatedSearches);

    try {
      await AsyncStorage.setItem(
        RECENT_SEARCHES_KEY,
        JSON.stringify(updatedSearches),
      );
    } catch (error) {
      console.log('Failed to save recent search:', error);
    }
  };

  const handleSubmitSearch = () => {
    const value = searchText.trim();
    if (!value) return;

    saveRecentSearch(value);
    setDebouncedSearch(value);
    Keyboard.dismiss();
  };

  const handleRecentSearch = (value: string) => {
    saveRecentSearch(value);
    setSearchText(value);
    setDebouncedSearch(value);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    navigation.goBack();
  };

  const clearSearch = () => {
    setSearchText('');
    setDebouncedSearch('');
  };

  const openFilter = () => {
    setDraftFilters({ ...filters });
    setFilterOpen(true);
  };

  const clearFilters = () => {
    setFilters(scopedFilters);
    setDraftFilters(scopedFilters);
  };

  const hasSearch = searchText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <QuickCartWordmark
          style={styles.logoRow}
          textStyle={styles.logoText}
          markSize={30}
          gap={4}
        />

        <Pressable
          onPress={handleClose}
          hitSlop={12}
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      <View style={styles.searchBox}>
        <View style={styles.searchIcon}>
          <View style={styles.searchHandle} />
        </View>

        <TextInput
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSubmitSearch}
          placeholder={t('ui.common.searchPlaceholder')}
          placeholderTextColor={theme.colors.grey150}
          autoFocus
          returnKeyType="search"
          style={styles.searchInput}
          selectionColor={theme.colors.cyan}
        />

        {searchText.length > 0 ? (
          <Pressable
            onPress={clearSearch}
            hitSlop={8}
            style={styles.clearButton}
            accessibilityLabel={t('ui.common.clearSearch')}
          >
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}

        <Pressable
          onPress={openFilter}
          hitSlop={8}
          style={styles.filterButton}
          accessibilityLabel={t('ui.common.openProductFilters')}
        >
          <View style={styles.filterLineTop} />
          <View style={styles.filterLineMiddle} />
          <View style={styles.filterLineBottom} />
          <View style={styles.filterKnobTop} />
          <View style={styles.filterKnobMiddle} />
          <View style={styles.filterKnobBottom} />
        </Pressable>
      </View>

      {!hasSearch && !hasActiveFilters ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.recentContent}
        >
          <Text style={styles.recentTitle}>{t('ui.search.recentSearches')}</Text>

          {recentSearchesLoaded && recentSearches.length > 0 ? (
            recentSearches.map(item => (
              <Pressable
                key={item}
                style={styles.recentRow}
                onPress={() => handleRecentSearch(item)}
              >
                <Text style={styles.recentText}>{item}</Text>
                <Text style={styles.recentArrow}>↖</Text>
              </Pressable>
            ))
          ) : (
            <View style={styles.emptyRecentBox}>
              <Text style={styles.emptyRecentText}>{t('ui.search.noRecentSearches')}</Text>
            </View>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.resultsContent}
        >
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>
              {t('ui.search.resultCount', { count: products.length })}
            </Text>
            {isFetching ? <ActivityIndicator size="small" /> : null}
          </View>

          {isFetching && products.length === 0 ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" />
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>{t('ui.search.errorTitle')}</Text>
              <Text style={styles.stateText}>{t('ui.search.errorDescription')}</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>{t('ui.search.emptyTitle')}</Text>
              <Text style={styles.stateText}>
                {t('ui.search.emptyDescription')}
              </Text>
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

                    <Text style={styles.productName} numberOfLines={2}>
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
        </ScrollView>
      )}

      <FilterModal
        visible={filterOpen}
        filters={draftFilters}
        categories={categories}
        onChange={setDraftFilters}
        onClose={() => setFilterOpen(false)}
        onClear={clearFilters}
        onApply={() => {
          setFilters({ ...draftFilters });
          setFilterOpen(false);
        }}
      />
    </SafeAreaView>
  );
};

const FilterModal = ({
  visible,
  filters,
  categories,
  onChange,
  onClose,
  onClear,
  onApply,
}: {
  visible: boolean;
  filters: ProductFilters;
  categories: Array<{ _id: string; name: string }>;
  onChange: (filters: ProductFilters) => void;
  onClose: () => void;
  onClear: () => void;
  onApply: () => void;
}) => {
  const styles = useStyles();
  const { t } = useTranslation();
  const update = (changes: Partial<ProductFilters>) =>
    onChange({ ...filters, ...changes });
  const sortOptions: Array<{ key: SortOption; label: string }> = [
    { key: 'priceLow', label: t('ui.search.sortPriceLow') },
    { key: 'priceHigh', label: t('ui.search.sortPriceHigh') },
    { key: 'rating', label: t('ui.search.sortHighestRated') },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <Pressable style={styles.modalDismiss} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>{t('search.filterTitle')}</Text>
              <Pressable onPress={onClear} hitSlop={8}>
                <Text style={styles.clearFiltersText}>{t('search.clear')}</Text>
              </Pressable>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>{t('search.category')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChoices}>
              <FilterChoice label={t('search.all')} selected={!filters.categoryId} onPress={() => update({ categoryId: null })} styles={styles} />
              {categories.map(category => (
                <FilterChoice key={category._id} label={category.name} selected={filters.categoryId === category._id} onPress={() => update({ categoryId: category._id })} styles={styles} />
              ))}
            </ScrollView>

            <Text style={styles.filterSectionTitle}>{t('search.priceRange')}</Text>
            <View style={styles.priceInputs}>
              <TextInput value={filters.minPrice} onChangeText={minPrice => update({ minPrice })} placeholder={t('search.minimum')} placeholderTextColor={styles.filterInputPlaceholder.color} keyboardType="decimal-pad" style={styles.filterInput} />
              <TextInput value={filters.maxPrice} onChangeText={maxPrice => update({ maxPrice })} placeholder={t('search.maximum')} placeholderTextColor={styles.filterInputPlaceholder.color} keyboardType="decimal-pad" style={styles.filterInput} />
            </View>

            <Pressable style={styles.filterToggleRow} onPress={() => update({ inStock: !filters.inStock })}>
              <View style={[styles.checkbox, filters.inStock && styles.checkboxChecked]}>{filters.inStock ? <Text style={styles.checkmark}>✓</Text> : null}</View>
              <Text style={styles.filterLabel}>{t('search.inStock')}</Text>
            </Pressable>

            <Text style={styles.filterSectionTitle}>{t('search.sortBy')}</Text>
            {sortOptions.map(option => (
              <Pressable key={option.key} style={styles.filterToggleRow} onPress={() => update({ sort: filters.sort === option.key ? null : option.key })}>
                <View style={[styles.checkbox, filters.sort === option.key && styles.checkboxChecked]}>{filters.sort === option.key ? <Text style={styles.checkmark}>✓</Text> : null}</View>
                <Text style={styles.filterLabel}>{option.label}</Text>
              </Pressable>
            ))}

            <Pressable style={styles.applyButton} onPress={onApply}>
              <Text style={styles.applyText}>{t('search.apply')}</Text>
            </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const FilterChoice = ({
  label,
  selected,
  onPress,
  styles,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  styles: ReturnType<typeof useStyles>;
}) => (
  <Pressable style={[styles.filterChoice, selected && styles.filterChoiceSelected]} onPress={onPress}>
    <Text style={[styles.filterChoiceText, selected && styles.filterChoiceTextSelected]}>{label}</Text>
  </Pressable>
);

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 62,
      paddingHorizontal: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logoRow: { flexDirection: 'row', alignItems: 'center' },
    logoText: {
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 18,
      color: colors.text,
    },
    closeButton: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 32,
      lineHeight: 32,
      color: colors.text,
    },
    searchBox: {
      height: 56,
      marginHorizontal: spacing.lg,
      borderWidth: 1,
      borderColor: colors.grey50,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 13,
    },
    searchIcon: {
      width: 21,
      height: 21,
      borderWidth: 1.8,
      borderColor: colors.grey150,
      borderRadius: radius.pill,
      position: 'relative',
      marginRight: 10,
    },
    searchHandle: {
      position: 'absolute',
      width: 7,
      height: 1.8,
      backgroundColor: colors.grey150,
      right: -5,
      bottom: 0,
      transform: [{ rotate: '48deg' }],
      borderRadius: radius.pill,
    },
    searchInput: {
      flex: 1,
      paddingVertical: 0,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 13,
      color: colors.text,
    },
    filterButton: {
      width: 27,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterLineTop: {
      position: 'absolute',
      width: 19,
      height: 1.5,
      backgroundColor: colors.grey150,
      top: 7,
    },
    filterLineMiddle: {
      position: 'absolute',
      width: 19,
      height: 1.5,
      backgroundColor: colors.grey150,
      top: 13,
    },
    filterLineBottom: {
      position: 'absolute',
      width: 19,
      height: 1.5,
      backgroundColor: colors.grey150,
      top: 19,
    },
    filterKnobTop: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: colors.grey150,
      backgroundColor: colors.surface,
      top: 5,
      left: 9,
    },
    filterKnobMiddle: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: colors.grey150,
      backgroundColor: colors.surface,
      top: 11,
      left: 15,
    },
    filterKnobBottom: {
      position: 'absolute',
      width: 5,
      height: 5,
      borderRadius: 3,
      borderWidth: 1.5,
      borderColor: colors.grey150,
      backgroundColor: colors.surface,
      top: 17,
      left: 7,
    },
    recentContent: { paddingTop: 30, paddingBottom: 30 },
    recentTitle: {
      ...typography.captionSemiBold,
      color: colors.text,
      marginHorizontal: spacing.lg,
      marginBottom: 12,
    },
    recentRow: {
      minHeight: 48,
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    recentText: { ...typography.body2Regular, color: colors.text },
    recentArrow: { fontSize: 25, color: '#BFC1C7' },
    emptyRecentBox: { paddingHorizontal: spacing.lg, paddingTop: 18 },
    emptyRecentText: {
      ...typography.captionRegular,
      color: colors.secondaryText,
    },
    resultsContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: 24,
      paddingBottom: 30,
    },
    resultsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    resultsTitle: { ...typography.captionSemiBold, color: colors.text },
    productGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    productCard: { width: '48.3%', marginBottom: spacing.xl },
    productImageContainer: {
      height: 145,
      borderRadius: radius.xl,
      overflow: 'hidden',
      backgroundColor: colors.grey50,
      position: 'relative',
    },
    productImage: { width: '100%', height: '100%' },
    productFallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    productFallbackEmoji: { fontSize: 54 },
    heartButton: {
      position: 'absolute',
      top: 7,
      right: 7,
      width: 28,
      height: 28,
      borderRadius: radius.pill,
      backgroundColor: colors.grey50,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heartText: { color: colors.white, fontSize: 17 },
    productName: {
      ...typography.body2Regular,
      color: colors.text,
      marginTop: spacing.sm,
    },
    productPrice: { ...typography.body2Medium, color: colors.text },
    originalPrice: {
      ...typography.captionRegular,
      color: colors.grey100,
      textDecorationLine: 'line-through',
    },
    stateBox: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    stateTitle: {
      ...typography.body1Medium,
      color: colors.text,
      textAlign: 'center',
    },
    stateText: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: spacing.xs,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalDismiss: { flex: 1 },
    filterSheet: {
      maxHeight: '82%',
      borderTopLeftRadius: radius.xxl,
      borderTopRightRadius: radius.xxl,
      padding: spacing.lg,
      backgroundColor: colors.surface,
    },
    sheetHandle: {
      alignSelf: 'center',
      width: 42,
      height: 4,
      marginBottom: spacing.lg,
      borderRadius: radius.pill,
      backgroundColor: colors.grey100,
    },
    filterHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    filterTitle: { ...typography.heading3Bold, color: colors.text },
    clearFiltersText: { ...typography.captionSemiBold, color: colors.cyan },
    filterSectionTitle: {
      ...typography.body2Medium,
      color: colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    filterChoices: { gap: spacing.sm, paddingBottom: spacing.xs },
    filterChoice: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      backgroundColor: colors.background,
    },
    filterChoiceSelected: {
      borderColor: colors.cyan,
      backgroundColor: colors.cyan50,
    },
    filterChoiceText: { ...typography.captionRegular, color: colors.text },
    filterChoiceTextSelected: {
      ...typography.captionSemiBold,
      color: colors.cyan,
    },
    priceInputs: { flexDirection: 'row', gap: spacing.sm },
    filterInput: {
      flex: 1,
      height: 44,
      paddingHorizontal: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.md,
      backgroundColor: colors.background,
      color: colors.text,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 13,
    },
    filterInputPlaceholder: { color: colors.secondaryText },
    filterToggleRow: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderWidth: 1.5,
      borderColor: colors.grey150,
      borderRadius: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clearButton: {
      width: 24,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.xs,
    },
    clearText: { fontSize: 22, lineHeight: 24, color: colors.secondaryText },
    checkboxChecked: { borderColor: colors.cyan, backgroundColor: colors.cyan },
    checkmark: { color: colors.control, fontSize: 15, fontWeight: '700' },
    filterLabel: { ...typography.body2Regular, color: colors.text },
    applyButton: {
      height: 48,
      marginTop: spacing.lg,
      marginBottom: spacing.md,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cyan,
    },
    applyText: { ...typography.body2Medium, color: colors.control },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default SearchScreen;

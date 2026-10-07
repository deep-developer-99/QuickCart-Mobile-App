import React, { useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
  useGetProductsQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  type ProductResponse,
} from '../../api/quickCartApi';
import { colors, radius, spacing, typography } from '../../theme';

type Product = ProductResponse['data'][number];

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
  const navigation = useNavigation<any>();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [recentSearchesLoaded, setRecentSearchesLoaded] = useState(false);

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

  const {
    data: productResponse,
    isFetching,
    isError,
  } = useGetProductsQuery(backendSearch || undefined, {
    skip: !backendSearch,
  });

  const products = useMemo<Product[]>(
    () => (Array.isArray(productResponse?.data) ? productResponse.data : []),
    [productResponse],
  );

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

  const hasSearch = searchText.trim().length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>Q</Text>
          </View>
          <Text style={styles.logoText}>uickMart</Text>
        </View>

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
          placeholder="Search"
          placeholderTextColor="#8D91A0"
          autoFocus
          returnKeyType="search"
          style={styles.searchInput}
          selectionColor={colors.cyan}
        />

        <Pressable
          onPress={clearSearch}
          hitSlop={8}
          style={styles.filterButton}
          accessibilityLabel="Clear search"
        >
          <View style={styles.filterLineTop} />
          <View style={styles.filterLineMiddle} />
          <View style={styles.filterLineBottom} />
          <View style={styles.filterKnobTop} />
          <View style={styles.filterKnobMiddle} />
          <View style={styles.filterKnobBottom} />
        </Pressable>
      </View>

      {!hasSearch ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.recentContent}
        >
          <Text style={styles.recentTitle}>RECENT SEARCH</Text>

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
              <Text style={styles.emptyRecentText}>No recent searches</Text>
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
            <Text style={styles.resultsTitle}>SEARCH RESULTS</Text>
            {isFetching ? <ActivityIndicator size="small" /> : null}
          </View>

          {isFetching && products.length === 0 ? (
            <View style={styles.stateBox}>
              <ActivityIndicator size="large" />
            </View>
          ) : isError ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>Something went wrong</Text>
              <Text style={styles.stateText}>Please try searching again.</Text>
            </View>
          ) : products.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>No products found</Text>
              <Text style={styles.stateText}>
                Try a different product name or keyword.
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 62,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  logoMark: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  logoMarkText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 17,
    color: colors.white,
  },
  logoText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 18,
    color: colors.black,
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
    color: colors.black,
  },
  searchBox: {
    height: 56,
    marginHorizontal: spacing.lg,
    borderWidth: 1,
    borderColor: '#E9EBF3',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  searchIcon: {
    width: 21,
    height: 21,
    borderWidth: 1.8,
    borderColor: '#6F7384',
    borderRadius: radius.pill,
    position: 'relative',
    marginRight: 10,
  },
  searchHandle: {
    position: 'absolute',
    width: 7,
    height: 1.8,
    backgroundColor: '#6F7384',
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
    color: colors.black,
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
    backgroundColor: '#737786',
    top: 7,
  },
  filterLineMiddle: {
    position: 'absolute',
    width: 19,
    height: 1.5,
    backgroundColor: '#737786',
    top: 13,
  },
  filterLineBottom: {
    position: 'absolute',
    width: 19,
    height: 1.5,
    backgroundColor: '#737786',
    top: 19,
  },
  filterKnobTop: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#737786',
    backgroundColor: colors.white,
    top: 5,
    left: 9,
  },
  filterKnobMiddle: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#737786',
    backgroundColor: colors.white,
    top: 11,
    left: 15,
  },
  filterKnobBottom: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#737786',
    backgroundColor: colors.white,
    top: 17,
    left: 7,
  },
  recentContent: { paddingTop: 30, paddingBottom: 30 },
  recentTitle: {
    ...typography.captionSemiBold,
    color: colors.black,
    marginHorizontal: spacing.lg,
    marginBottom: 12,
  },
  recentRow: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentText: { ...typography.body2Regular, color: colors.black },
  recentArrow: { fontSize: 25, color: '#BFC1C7' },
  emptyRecentBox: { paddingHorizontal: spacing.lg, paddingTop: 18 },
  emptyRecentText: { ...typography.captionRegular, color: '#8D91A0' },
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
  resultsTitle: { ...typography.captionSemiBold, color: colors.black },
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
  productFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  productFallbackEmoji: { fontSize: 54 },
  heartButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 28,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartText: { color: colors.white, fontSize: 17 },
  productName: {
    ...typography.body2Regular,
    color: colors.black,
    marginTop: spacing.sm,
  },
  productPrice: { ...typography.body2Medium, color: colors.black },
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
    color: colors.black,
    textAlign: 'center',
  },
  stateText: {
    ...typography.captionRegular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default SearchScreen;

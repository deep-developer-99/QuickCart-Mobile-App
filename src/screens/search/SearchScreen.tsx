import React, { useEffect, useMemo, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import { useGetProductsQuery } from '../../api/quickCartApi';
import { addToCart, type CartProduct } from '../../store/slices/cartSlice';
import { toggleWishlist } from '../../store/slices/wishlistSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { colors, radius, spacing, typography } from '../../theme';

interface Product extends CartProduct {
  category?: string | { _id: string; name: string };
}

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

const SearchScreen = () => {
  const navigation = useNavigation<any>();
  const dispatch = useDispatch<AppDispatch>();
  const [searchText, setSearchText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const wishlistIds = useSelector((state: RootState) =>
    state.wishlist.items.map(item => item._id),
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchText.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchText]);

  const { data, isLoading, isFetching, isError } = useGetProductsQuery(
    searchTerm || undefined,
  );

  const products = useMemo<Product[]>(
    () => (Array.isArray(data?.data) ? data.data : []),
    [data],
  );

  const handleSearchSubmit = () => {
    const value = searchText.trim();
    if (!value) return;

    setSearchTerm(value);
    setRecentSearches(previous =>
      [
        value,
        ...previous.filter(item => item.toLowerCase() !== value.toLowerCase()),
      ].slice(0, 6),
    );
    Keyboard.dismiss();
  };

  const handleRecentSearch = (value: string) => {
    setSearchText(value);
    setSearchTerm(value);
  };

  const clearSearch = () => {
    setSearchText('');
    setSearchTerm('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search products"
            placeholderTextColor={colors.grey150}
            style={styles.searchInput}
            autoFocus
            returnKeyType="search"
          />
          {searchText.length > 0 ? (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {searchTerm.length === 0 ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          {recentSearches.length > 0 ? (
            <>
              <Text style={styles.sectionTitle}>RECENT SEARCHES</Text>
              {recentSearches.map(item => (
                <Pressable
                  key={item}
                  style={styles.recentRow}
                  onPress={() => handleRecentSearch(item)}
                >
                  <Text style={styles.recentText}>{item}</Text>
                  <Text style={styles.recentArrow}>›</Text>
                </Pressable>
              ))}
            </>
          ) : (
            <View style={styles.emptySearch}>
              <Text style={styles.emptyTitle}>Search for products</Text>
              <Text style={styles.emptyText}>
                Type a product name to find matching products.
              </Text>
            </View>
          )}
        </ScrollView>
      ) : isLoading || isFetching ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.black} />
          <Text style={styles.loadingText}>Searching products...</Text>
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Unable to search</Text>
          <Text style={styles.emptyText}>Please try again.</Text>
        </View>
      ) : products.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>No products found</Text>
          <Text style={styles.emptyText}>
            No product matches “{searchTerm}”. Try another word.
          </Text>
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.productGrid}
        >
          {products.map(product => {
            const isWishlisted = wishlistIds.includes(product._id);
            const displayPrice = product.discountPrice ?? product.price;

            return (
              <View key={product._id} style={styles.productCard}>
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

                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <View style={styles.priceRow}>
                  <Text style={styles.productPrice}>₹{displayPrice}</Text>
                  {product.discountPrice ? (
                    <Text style={styles.originalPrice}>₹{product.price}</Text>
                  ) : null}
                </View>

                <Pressable
                  style={styles.addButton}
                  onPress={() => dispatch(addToCart(product))}
                  disabled={product.stock <= 0}
                >
                  <Text style={styles.addButtonText}>
                    {product.stock > 0 ? 'Add to cart' : 'Out of stock'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  header: {
    height: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  backIcon: {
    fontSize: 38,
    lineHeight: 38,
    color: colors.black,
    width: 35,
  },
  searchBox: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: '#EEF0F8',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  searchIcon: { fontSize: 26, color: colors.grey150 },
  searchInput: {
    ...typography.body2Regular,
    flex: 1,
    color: colors.black,
    marginHorizontal: spacing.sm,
  },
  clearText: { fontSize: 28, color: colors.grey150 },
  sectionTitle: {
    ...typography.captionSemiBold,
    color: colors.black,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  recentRow: {
    height: 52,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF0F8',
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentText: { ...typography.body2Regular, color: colors.black },
  recentArrow: { fontSize: 24, color: colors.grey100 },
  emptySearch: {
    paddingHorizontal: spacing.xl,
    paddingTop: 80,
    alignItems: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  loadingText: {
    ...typography.body2Regular,
    color: colors.grey150,
    marginTop: spacing.md,
  },
  emptyTitle: {
    ...typography.heading3Bold,
    color: colors.black,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body2Regular,
    color: colors.grey150,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  productGrid: {
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 40,
  },
  productCard: { width: '48.2%', marginBottom: spacing.lg },
  productImageWrap: {
    height: 138,
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
  productEmoji: { fontSize: 52 },
  heartButton: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: '#1D1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartText: { color: colors.white, fontSize: 18 },
  productName: {
    ...typography.body2Regular,
    color: colors.black,
    marginTop: spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: 2,
  },
  productPrice: { ...typography.body2Medium, color: colors.black },
  originalPrice: {
    ...typography.captionRegular,
    color: colors.grey100,
    textDecorationLine: 'line-through',
  },
  addButton: {
    height: 38,
    marginTop: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { ...typography.captionSemiBold, color: colors.white },
});

export default SearchScreen;

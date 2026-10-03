import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  useGetCategoriesQuery,
  useGetProductsQuery,
} from '../../api/quickCartApi';
import type { RootState } from '../../store/store';
import { HomeScreenStyles as styles } from './HomeScreen.styles';

interface Category {
  _id: string;
  name: string;
  image?: string;
}
interface Product {
  _id: string;
  name: string;
  image?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category?: string | { _id: string; name: string };
}

const categoryEmoji: Record<string, string> = {
  grocery: '🛒',
  'fruits & vegetables': '🥦',
  fruits: '🍎',
  vegetables: '🥬',
  dairy: '🥛',
  snacks: '🍪',
  beverages: '🥤',
  household: '🧹',
  personal: '🧴',
  bakery: '🍞',
  meat: '🍗',
  electronics: '📱',
};
const productEmoji = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('milk')) return '🥛';
  if (value.includes('bread')) return '🍞';
  if (value.includes('apple')) return '🍎';
  if (value.includes('banana')) return '🍌';
  if (value.includes('chips')) return '🥔';
  if (value.includes('juice')) return '🧃';
  if (value.includes('water')) return '💧';
  if (value.includes('soap')) return '🧼';
  return '🛍️';
};

const ProductCard = ({ product }: { product: Product }) => {
  const hasDiscount =
    product.discountPrice !== undefined &&
    product.discountPrice < product.price;
  const sellingPrice = product.discountPrice ?? product.price;
  return (
    <Pressable style={styles.productCard}>
      <View style={styles.productImageContainer}>
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
        <Pressable style={styles.heartButton} hitSlop={8}>
          <Text style={styles.heartText}>♡</Text>
        </Pressable>
      </View>
      <View style={styles.colorRow}>
        <View style={[styles.colorDot, styles.blackColorDot]} />
        <View style={[styles.colorDot, styles.greenColorDot]} />
        <Text style={styles.colorMore}>Available</Text>
      </View>
      <Text style={styles.productName} numberOfLines={1}>
        {product.name}
      </Text>
      <Text style={styles.productPrice}>₹{sellingPrice.toFixed(2)}</Text>
      {hasDiscount && (
        <Text style={styles.originalPrice}>₹{product.price.toFixed(2)}</Text>
      )}
    </Pressable>
  );
};

const HomeScreen = () => {
  const insets = useSafeAreaInsets();
  const user = useSelector((state: RootState) => state.auth.user);
  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();
  const {
    data: productResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useGetProductsQuery();

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
  const refreshHome = async () => {
    await Promise.all([refetchCategories(), refetchProducts()]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
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
              <Pressable hitSlop={10}>
                <View style={styles.searchIcon}>
                  <View style={styles.searchHandle} />
                </View>
              </Pressable>
              <Pressable style={styles.avatar} hitSlop={8}>
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

        <Pressable style={styles.banner}>
          <View style={styles.bannerGlow} />
          <View style={styles.bannerContent}>
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>UP TO 30% OFF</Text>
            </View>
            <Text style={styles.bannerEyebrow}>Fresh essentials</Text>
            <Text style={styles.bannerTitle}>Delivered Fast</Text>
          </View>
          <Text style={styles.bannerEmoji}>🛍️</Text>
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
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {categoriesLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Loading categories...</Text>
            </View>
          ) : categories.length === 0 ? (
            <Text style={styles.emptyText}>No categories available yet.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map(category => (
                <Pressable key={category._id} style={styles.categoryCard}>
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
            <Pressable>
              <Text style={styles.seeAll}>See all</Text>
            </Pressable>
          </View>
          {productsLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" />
              <Text style={styles.loadingText}>Loading products...</Text>
            </View>
          ) : products.length === 0 ? (
            <Text style={styles.emptyText}>No products available yet.</Text>
          ) : (
            <View style={styles.productGrid}>
              {products.map(product => (
                <ProductCard key={product._id} product={product} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <View
        style={[
          styles.bottomNav,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        <Pressable style={styles.navItem}>
          <Text style={[styles.navIcon, styles.navIconActive]}>⌂</Text>
          <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>▦</Text>
          <Text style={styles.navLabel}>Categories</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <View>
            <Text style={styles.navIcon}>🛒</Text>
            <View style={styles.cartBadge} />
          </View>
          <Text style={styles.navLabel}>My Cart</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>♡</Text>
          <Text style={styles.navLabel}>Wishlist</Text>
        </Pressable>
        <Pressable style={styles.navItem}>
          <Text style={styles.navIcon}>♙</Text>
          <Text style={styles.navLabel}>Profile</Text>
        </Pressable>
      </View>
    </View>
  );
};

export default HomeScreen;

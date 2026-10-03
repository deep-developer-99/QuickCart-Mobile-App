import React from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from '../../store/store';
import { addToCart } from '../../store/slices/cartSlice';
import removeFromWishlist from '../../store/slices/cartSlice';
import { colors, radius, spacing, typography } from '../../theme';

const WishlistScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.wishlist.items);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Wishlist</Text>
        <Text style={styles.count}>{items.length} saved</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>♡</Text>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptyText}>
            Tap the heart on a product to save it here.
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
        >
          {items.map(item => {
            const price = item.discountPrice ?? item.price;
            return (
              <View key={item._id} style={styles.card}>
                <View style={styles.imageWrap}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.image}
                      resizeMode="cover"
                    />
                  ) : (
                    <Text style={styles.fallback}>🛍️</Text>
                  )}
                  <Pressable
                    style={styles.heartButton}
                    onPress={() => dispatch(removeFromWishlist(item._id))}
                  >
                    <Text style={styles.heart}>♥</Text>
                  </Pressable>
                </View>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.price}>₹{price.toFixed(2)}</Text>
                <Pressable
                  style={styles.addButton}
                  onPress={() => dispatch(addToCart(item))}
                >
                  <Text style={styles.addText}>Add to Cart</Text>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { ...typography.heading3Bold, color: colors.black },
  count: { ...typography.captionRegular, color: colors.grey150, marginTop: 2 },
  grid: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 100,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: { width: '48.2%', marginBottom: spacing.lg },
  imageWrap: {
    height: 145,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: '#F2F3F4',
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  fallback: { fontSize: 48 },
  heartButton: {
    position: 'absolute',
    right: 7,
    top: 7,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#1D1D1D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heart: { fontSize: 16, color: colors.white },
  name: {
    ...typography.body2Regular,
    color: colors.black,
    marginTop: spacing.sm,
  },
  price: { ...typography.body2Medium, color: colors.black, marginTop: 2 },
  addButton: {
    height: 38,
    borderRadius: radius.sm,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  addText: { ...typography.captionSemiBold, color: colors.white },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: { fontSize: 68, color: colors.grey150 },
  emptyTitle: {
    ...typography.heading3Bold,
    color: colors.black,
    marginTop: spacing.lg,
  },
  emptyText: {
    ...typography.body2Regular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default WishlistScreen;

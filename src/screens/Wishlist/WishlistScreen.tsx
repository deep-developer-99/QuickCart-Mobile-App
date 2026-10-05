import React, { useState } from 'react';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';

import {
  removeFromWishlist,
  type WishlistItem,
} from '../../store/slices/wishlistSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { colors, radius, spacing, typography } from '../../theme';

const WishlistScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();

  const wishlistItems = useSelector((state: RootState) => state.wishlist.items);

  // Quantity is kept locally because WishlistItem does not contain a quantity.
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQuantity = (id: string) => quantities[id] ?? 1;

  const increaseQuantity = (item: WishlistItem) => {
    setQuantities(previous => {
      const current = previous[item._id] ?? 1;

      if (current >= item.stock) {
        return previous;
      }

      return {
        ...previous,
        [item._id]: current + 1,
      };
    });
  };

  const decreaseQuantity = (item: WishlistItem) => {
    setQuantities(previous => {
      const current = previous[item._id] ?? 1;

      if (current <= 1) {
        return previous;
      }

      return {
        ...previous,
        [item._id]: current - 1,
      };
    });
  };

  const removeItem = (id: string) => {
    dispatch(removeFromWishlist(id));

    setQuantities(previous => {
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  const renderWishlistItem = ({ item }: { item: WishlistItem }) => {
    const quantity = getQuantity(item._id);
    const hasDiscount =
      item.discountPrice !== undefined && item.discountPrice < item.price;

    const currentPrice = item.discountPrice ?? item.price;

    return (
      <View style={styles.productRow}>
        <View style={styles.productImageWrapper}>
          {item.image ? (
            <Image
              source={{ uri: item.image }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imageFallback}>
              <Text style={styles.fallbackEmoji}>🛍️</Text>
            </View>
          )}
        </View>

        <View style={styles.productContent}>
          <Text style={styles.productName} numberOfLines={2}>
            {item.name}
          </Text>

          <Text style={styles.productPrice}>${currentPrice.toFixed(2)}</Text>

          {hasDiscount ? (
            <Text style={styles.originalPrice}>${item.price.toFixed(2)}</Text>
          ) : null}

          <View style={styles.bottomRow}>
            <View style={styles.quantityControl}>
              <Pressable
                style={styles.quantityButton}
                onPress={() => decreaseQuantity(item)}
                hitSlop={6}
              >
                <Text style={styles.quantityMinus}>−</Text>
              </Pressable>

              <Text style={styles.quantityText}>{quantity}</Text>

              <Pressable
                style={styles.quantityButton}
                onPress={() => increaseQuantity(item)}
                hitSlop={6}
              >
                <Text style={styles.quantityPlus}>+</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.deleteButton}
              onPress={() => removeItem(item._id)}
              hitSlop={10}
              accessibilityLabel={`Remove ${item.name} from wishlist`}
            >
              <View style={styles.trashIcon}>
                <View style={styles.trashLid} />
                <View style={styles.trashBody}>
                  <View style={styles.trashLine} />
                  <View style={styles.trashLine} />
                </View>
              </View>
            </Pressable>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            }
          }}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>

        <Text style={styles.headerTitle}>Wishlist</Text>

        <View style={styles.headerSpacer} />
      </View>

      {wishlistItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyHeart}>♡</Text>
          <Text style={styles.emptyTitle}>Your Wishlist is Empty</Text>
          <Text style={styles.emptyText}>
            Products you add to your wishlist will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={wishlistItems}
          keyExtractor={item => item._id}
          renderItem={renderWishlistItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },

  header: {
    height: 61,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },

  backButton: {
    width: 32,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },

  backIcon: {
    fontSize: 31,
    lineHeight: 34,
    color: colors.black,
    fontWeight: '300',
  },

  headerTitle: {
    ...typography.body1Regular,
    color: colors.black,
    marginLeft: 8,
  },

  headerSpacer: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },

  productRow: {
    flexDirection: 'row',
    minHeight: 120,
    marginBottom: spacing.md,
  },

  productImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.grey50,
  },

  productImage: {
    width: '100%',
    height: '100%',
  },

  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grey50,
  },

  fallbackEmoji: {
    fontSize: 42,
  },

  productContent: {
    flex: 1,
    minHeight: 120,
    marginLeft: spacing.sm,
  },

  productName: {
    ...typography.body2Regular,
    color: colors.black,
    lineHeight: 20,
    paddingRight: spacing.xs,
  },

  productPrice: {
    ...typography.body2Medium,
    color: colors.black,
    marginTop: 5,
  },

  originalPrice: {
    ...typography.captionRegular,
    color: colors.grey100,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },

  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },

  quantityControl: {
    width: 88,
    height: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E7EAF2',
    borderRadius: 7,
    backgroundColor: colors.white,
  },

  quantityButton: {
    width: 28,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },

  quantityMinus: {
    fontSize: 19,
    lineHeight: 22,
    color: '#C9CCD5',
    fontWeight: '400',
  },

  quantityPlus: {
    fontSize: 21,
    lineHeight: 23,
    color: '#BFC3CC',
    fontWeight: '300',
  },

  quantityText: {
    ...typography.body2Regular,
    color: '#9A9DA8',
    minWidth: 18,
    textAlign: 'center',
  },

  deleteButton: {
    width: 30,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 1,
  },

  trashIcon: {
    width: 18,
    height: 21,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },

  trashLid: {
    width: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FF4B4B',
    marginTop: 1,
  },

  trashBody: {
    width: 13,
    height: 15,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: '#FF4B4B',
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  trashLine: {
    width: 1,
    height: 8,
    backgroundColor: '#FF4B4B',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },

  emptyHeart: {
    fontSize: 72,
    color: colors.grey100,
  },

  emptyTitle: {
    ...typography.heading3Bold,
    color: colors.black,
    marginTop: spacing.md,
  },

  emptyText: {
    ...typography.body2Regular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});

export default WishlistScreen;

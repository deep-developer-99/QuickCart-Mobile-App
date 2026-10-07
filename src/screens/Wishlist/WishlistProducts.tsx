import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { CartProduct } from '../../api/quickCartApi';
import { useRemoveFromWishlistMutation } from '../../api/quickCartApi';
import { colors, radius, spacing, typography } from '../../theme';

interface WishlistProductsProps {
  products: CartProduct[];
}

const WishlistProducts = ({ products }: WishlistProductsProps) => {
  const navigation = useNavigation<any>();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQuantity = (id: string) => quantities[id] ?? 1;

  const updateQuantity = (
    item: CartProduct,
    direction: 'increase' | 'decrease',
  ) => {
    setQuantities(previous => {
      const current = previous[item._id] ?? 1;
      const next = direction === 'increase' ? current + 1 : current - 1;

      if (next < 1 || next > item.stock) {
        return previous;
      }

      return { ...previous, [item._id]: next };
    });
  };

  const handleRemove = async (productId: string) => {
    try {
      await removeFromWishlist(productId).unwrap();
      setQuantities(previous => {
        const next = { ...previous };
        delete next[productId];
        return next;
      });
    } catch (error) {
      console.error('Failed to remove product from wishlist:', error);
    }
  };

  const renderItem = ({ item }: { item: CartProduct }) => {
    const quantity = getQuantity(item._id);
    const currentPrice = item.discountPrice ?? item.price;
    const hasDiscount =
      item.discountPrice !== undefined && item.discountPrice < item.price;

    return (
      <View style={styles.productRow}>
        <View style={styles.imageWrapper}>
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

          <Text style={styles.productPrice}>₹{currentPrice.toFixed(2)}</Text>

          {hasDiscount ? (
            <Text style={styles.originalPrice}>₹{item.price.toFixed(2)}</Text>
          ) : null}

          <View style={styles.bottomRow}>
            <View style={styles.quantityControl}>
              <Pressable
                style={styles.quantityButton}
                onPress={() => updateQuantity(item, 'decrease')}
                hitSlop={6}
              >
                <Text style={styles.quantityMinus}>−</Text>
              </Pressable>
              <Text style={styles.quantityText}>{quantity}</Text>
              <Pressable
                style={styles.quantityButton}
                onPress={() => updateQuantity(item, 'increase')}
                hitSlop={6}
              >
                <Text style={styles.quantityPlus}>+</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.deleteButton}
              onPress={() => handleRemove(item._id)}
              hitSlop={10}
              accessibilityRole="button"
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
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          hitSlop={10}
          accessibilityLabel="Go back"
        >
          <Text style={styles.backIcon}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Wishlist</Text>
      </View>

      <FlatList
        data={products}
        keyExtractor={item => item._id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
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
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 100,
  },
  productRow: {
    flexDirection: 'row',
    minHeight: 120,
    marginBottom: 16,
  },
  imageWrapper: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.grey50,
  },
  productImage: { width: '100%', height: '100%' },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grey50,
  },
  fallbackEmoji: { fontSize: 48 },
  productContent: { flex: 1, marginLeft: 9, minWidth: 0 },
  productName: {
    ...typography.body2Regular,
    color: colors.black,
    lineHeight: 20,
  },
  productPrice: {
    ...typography.body2Medium,
    color: colors.black,
    marginTop: 5,
  },
  originalPrice: {
    ...typography.captionRegular,
    color: '#777B89',
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
    height: 33,
    minWidth: 96,
    borderWidth: 1,
    borderColor: '#E7E9F0',
    borderRadius: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityMinus: { fontSize: 20, color: '#B5B8C3', lineHeight: 22 },
  quantityPlus: { fontSize: 20, color: '#B5B8C3', lineHeight: 22 },
  quantityText: {
    ...typography.body2Regular,
    color: '#B5B8C3',
  },
  deleteButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 1,
  },
  trashIcon: { width: 19, height: 22, alignItems: 'center' },
  trashLid: {
    width: 16,
    height: 2,
    backgroundColor: '#FF3B3B',
    borderRadius: 1,
    marginBottom: 2,
  },
  trashBody: {
    width: 14,
    height: 17,
    borderWidth: 1.5,
    borderColor: '#FF3B3B',
    borderTopWidth: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  trashLine: { width: 1, height: 10, backgroundColor: '#FF3B3B' },
});

export default WishlistProducts;

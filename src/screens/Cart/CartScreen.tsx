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
import {
  decrementCartItem,
  incrementCartItem,
  removeFromCart,
} from '../../store/slices/cartSlice';
import { colors, radius, spacing, typography } from '../../theme';

const CartScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const items = useSelector((state: RootState) => state.cart.items);

  const subtotal = items.reduce(
    (total, item) => total + (item.discountPrice ?? item.price) * item.quantity,
    0,
  );
  const delivery = subtotal === 0 || subtotal >= 500 ? 0 : 40;
  const total = subtotal + delivery;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <Text style={styles.count}>{items.length} items</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>▱</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptyText}>
            Add products from Home or Categories and they will appear here.
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}
          >
            {items.map(item => {
              const price = item.discountPrice ?? item.price;
              return (
                <View key={item._id} style={styles.item}>
                  <View style={styles.imageBox}>
                    {item.image ? (
                      <Image
                        source={{ uri: item.image }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={styles.fallback}>🛍️</Text>
                    )}
                  </View>

                  <View style={styles.details}>
                    <Text style={styles.name} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.price}>₹{price.toFixed(2)}</Text>
                    <View style={styles.bottomRow}>
                      <View style={styles.quantityBox}>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() => dispatch(decrementCartItem(item._id))}
                        >
                          <Text style={styles.quantitySymbol}>−</Text>
                        </Pressable>
                        <Text style={styles.quantity}>{item.quantity}</Text>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() => dispatch(incrementCartItem(item._id))}
                        >
                          <Text style={styles.quantitySymbol}>+</Text>
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={() => dispatch(removeFromCart(item._id))}
                      >
                        <Text style={styles.remove}>Remove</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          <View style={styles.summary}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery</Text>
              <Text style={delivery === 0 ? styles.free : styles.summaryValue}>
                {delivery === 0 ? 'FREE' : `₹${delivery.toFixed(2)}`}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>
            <Pressable style={styles.checkoutButton} onPress={() => {}}>
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </Pressable>
          </View>
        </>
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  item: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  imageBox: {
    width: 100,
    height: 100,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#F2F3F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: { width: '100%', height: '100%' },
  fallback: { fontSize: 38 },
  details: { flex: 1, marginLeft: spacing.md, justifyContent: 'space-between' },
  name: {
    ...typography.body2Regular,
    color: colors.black,
    paddingRight: spacing.xl,
  },
  price: {
    ...typography.body2Medium,
    color: colors.black,
    marginTop: spacing.xs,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  quantityBox: {
    height: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E4EB',
    borderRadius: radius.sm,
  },
  quantityButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantitySymbol: { fontSize: 20, color: colors.black },
  quantity: {
    ...typography.body2Medium,
    color: colors.black,
    minWidth: 25,
    textAlign: 'center',
  },
  remove: { ...typography.captionRegular, color: colors.red },
  summary: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  summaryLabel: { ...typography.body2Regular, color: colors.grey150 },
  summaryValue: { ...typography.body2Medium, color: colors.black },
  free: { ...typography.body2Medium, color: colors.cyan },
  divider: {
    height: 1,
    backgroundColor: '#F0F1F5',
    marginVertical: spacing.xs,
  },
  totalLabel: { ...typography.body1Medium, color: colors.black },
  totalValue: { ...typography.body1Medium, color: colors.black },
  checkoutButton: {
    height: 52,
    marginTop: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutText: { ...typography.body2Medium, color: colors.white },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxxl,
  },
  emptyIcon: { fontSize: 62, color: colors.grey150 },
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

export default CartScreen;

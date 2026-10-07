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
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, G, Line, Path, Rect } from 'react-native-svg';

import type { AppDispatch, RootState } from '../../store/store';
import {
  decrementCartItem,
  incrementCartItem,
  removeFromCart,
} from '../../store/slices/cartSlice';
import { colors, radius, spacing, typography } from '../../theme';

const EmptyCartIllustration = () => (
  <Svg width={210} height={190} viewBox="0 0 210 190" fill="none">
    {/* small decorative stars */}
    <Path
      d="M36 56l2.3 5.1L43 63l-4.7 1.8L36 70l-2.3-5.2L29 63l4.7-1.9L36 56Z"
      fill="#F3E85B"
    />
    <Path
      d="M173 125l1.8 4.1 3.7 1.5-3.7 1.5-1.8 4.1-1.8-4.1-3.7-1.5 3.7-1.5 1.8-4.1Z"
      fill="#F3E85B"
    />
    <Path
      d="M161 41l1.5 3.3 3.1 1.2-3.1 1.3-1.5 3.3-1.5-3.3-3.1-1.3 3.1-1.2 1.5-3.3Z"
      fill="#F3E85B"
    />

    {/* BUY speech bubble */}
    <Path
      d="M43 33c0-14.4 11.6-26 26-26h30c14.4 0 26 11.6 26 26v15c0 14.4-11.6 26-26 26H85l-12 12V74H69c-14.4 0-26-11.6-26-26V33Z"
      fill="#62D5EA"
    />
    <Path
      d="M43 34c0-14.4 11.6-26 26-26h30c14.4 0 26 11.6 26 26v15c0 14.4-11.6 26-26 26H85l-12 12V75H69c-14.4 0-26-11.6-26-26V34Z"
      stroke="#4AB9D0"
      strokeWidth={2}
    />

    {/* BUY text */}
    <G rotation={8} origin="84,39">
      <Rect x="57" y="23" width="57" height="31" rx="5" fill="#62D5EA" />
      <Path
        d="M63 29h9.3c5.2 0 8 2.6 8 6.1 0 2.1-1.1 3.8-3.1 4.7 2.6.8 4.1 2.7 4.1 5.2 0 4-3.1 6.8-8.6 6.8H63V29Zm7 5v5.1h2.8c2 0 3.1-1 3.1-2.6 0-1.6-1.1-2.5-3.1-2.5H70Zm0 9.6v5.1h3.3c2.1 0 3.3-1 3.3-2.6 0-1.7-1.2-2.5-3.3-2.5H70Z"
        fill="#F4F4F4"
      />
      <Path
        d="M86 29h7v18.2h-7V29Zm12.2 0h7l6.2 11.4V29h6.6v18.2h-7l-6.2-11.3v11.3h-6.6V29Z"
        fill="#F4F4F4"
      />
    </G>

    {/* cart handle */}
    <Path
      d="M77 62h35c4.1 0 7.5 3.3 7.5 7.5V73"
      stroke="#6C52C9"
      strokeWidth={8}
      strokeLinecap="round"
    />
    <Path
      d="M112 70h25"
      stroke="#6C52C9"
      strokeWidth={8}
      strokeLinecap="round"
    />

    {/* cart basket */}
    <Path
      d="M55 76h105l-10 58c-.9 5.3-5.5 9.2-10.9 9.2H72.2c-5.4 0-10-3.9-10.9-9.2L55 76Z"
      fill="#8067DD"
    />
    <Path
      d="M59 83h96l-6.8 39.4c-.8 4.5-4.7 7.8-9.3 7.8H74.1c-4.7 0-8.6-3.3-9.4-7.9L59 83Z"
      fill="#846BE2"
    />
    <Path
      d="M61 78h98"
      stroke="#6A51C7"
      strokeWidth={7}
      strokeLinecap="round"
    />

    {/* lower cart frame */}
    <Path
      d="M71 142h72c6 0 11 4.8 11 10.8v2.7H83"
      stroke="#8067DD"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M83 155h-7c-4.5 0-8-3.6-8-8v-1"
      stroke="#8067DD"
      strokeWidth={7}
      strokeLinecap="round"
    />

    {/* wheels */}
    <Ellipse cx="82" cy="168" rx="11" ry="15" fill="#B7B6BE" />
    <Ellipse cx="82" cy="165" rx="8" ry="12" fill="#D2D1D5" />
    <Ellipse cx="141" cy="168" rx="11" ry="15" fill="#B7B6BE" />
    <Ellipse cx="141" cy="165" rx="8" ry="12" fill="#D2D1D5" />
    <Ellipse cx="172" cy="154" rx="8" ry="11" fill="#B7B6BE" />
    <Ellipse cx="172" cy="152" rx="6" ry="9" fill="#D2D1D5" />

    {/* bell */}
    <G>
      <Circle cx="169" cy="55" r="8" fill="#6BE5B0" />
      <Circle cx="169" cy="55" r="4" fill="#F7FFF9" />
      <Path
        d="M146 64c0-13 8-22 21-22s22 9 22 22v15l6 6c1.8 2 .4 5.2-2.3 5.2h-51.4c-2.7 0-4.1-3.2-2.3-5.2l6-6V64Z"
        fill="#66DDAA"
      />
      <Path d="M144 80h50l-4 9h-42l-4-9Z" fill="#4FCB98" />
      <Path
        d="M153 94c2.5 7 12.5 8.5 16 1"
        stroke="#4FCB98"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Path
        d="M146 64c-3-3-7-4-10-2M190 65c4-2 7-1 10 2"
        stroke="#D8DCE4"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="198" cy="39" r="10" fill="#EF8E98" />
    </G>

    {/* notification badge "1" */}
    <Path
      d="M198 33c3.6 0 6 2.5 6 6s-2.4 6-6 6-6-2.5-6-6 2.4-6 6-6 6 2.5 6 6Z"
      fill="#EF8E98"
    />
    <Path d="M196.6 35.5h2.2v7h-2.2v-7Z" fill="#FFF" />

    {/* sparkle lines */}
    <Line x1="132" y1="46" x2="128" y2="40" stroke="#D9DCE5" strokeWidth={2} />
    <Line x1="139" y1="41" x2="139" y2="34" stroke="#D9DCE5" strokeWidth={2} />
    <Line x1="147" y1="43" x2="151" y2="37" stroke="#D9DCE5" strokeWidth={2} />
  </Svg>
);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My Cart</Text>
        <Text style={styles.count}>{items.length} items</Text>
      </View>

      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={styles.emptyIllustration}>
            <EmptyCartIllustration />
          </View>

          <Text style={styles.emptyTitle}>Your cart is empty</Text>

          <Text style={styles.emptyText}>
            Looks like you have not added anything in your cart. Go ahead and
            explore top categories.
          </Text>

          <Pressable style={styles.exploreButton}>
            <Text style={styles.exploreButtonText}>Explore Categories</Text>
          </Pressable>
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
                    ) : null}
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
    </SafeAreaView>
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
    paddingHorizontal: spacing.lg,
    paddingTop: 55,
  },
  emptyIllustration: {
    width: 210,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    ...typography.heading2Bold,
    color: colors.black,
    marginTop: 18,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body2Regular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: 12,
    maxWidth: 330,
    lineHeight: 22,
  },
  exploreButton: {
    width: '100%',
    height: 60,
    marginTop: 24,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exploreButtonText: {
    ...typography.button2,
    color: colors.white,
  },
});

export default CartScreen;

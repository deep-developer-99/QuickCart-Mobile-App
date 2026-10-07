import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import EmptyCart from './EmptyCart';
import {
  CartItem,
  useGetCartQuery,
  useRemoveCartItemMutation,
  useUpdateCartItemMutation,
} from '../../api/quickCartApi';
import { colors, radius, spacing, typography } from '../../theme';

const EMPTY_CART_ITEMS: CartItem[] = [];

const CartScreen = () => {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();

  const {
    data: cartResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetCartQuery();

  const [updateCartItem] = useUpdateCartItemMutation();
  const [removeCartItem] = useRemoveCartItemMutation();

  const items = cartResponse?.data?.items ?? EMPTY_CART_ITEMS;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [voucherVisible, setVoucherVisible] = useState(false);
  const [voucherCode, setVoucherCode] = useState('');

  useEffect(() => {
    setSelectedIds(items.map(item => item.product?._id).filter(Boolean));
  }, [items]);

  const selectedItems = useMemo(
    () => items.filter(item => selectedIds.includes(item.product?._id ?? '')),
    [items, selectedIds],
  );

  const subtotal = useMemo(
    () =>
      selectedItems.reduce(
        (total, item) =>
          total +
          (item.product?.discountPrice ?? item.product?.price ?? 0) *
            item.quantity,
        0,
      ),
    [selectedItems],
  );

  // Keep shipping dynamic-ready. Current Figma shows ₹0.00.
  const shippingCost = 0;
  const total = subtotal + shippingCost;

  const toggleSelection = (productId: string) => {
    setSelectedIds(current =>
      current.includes(productId)
        ? current.filter(id => id !== productId)
        : [...current, productId],
    );
  };

  const changeQuantity = async (item: CartItem, nextQuantity: number) => {
    const productId = item.product?._id;

    if (!productId) return;

    try {
      if (nextQuantity <= 0) {
        await removeCartItem(productId).unwrap();
        return;
      }

      if (item.product?.stock && nextQuantity > item.product.stock) {
        return;
      }

      await updateCartItem({
        productId,
        quantity: nextQuantity,
      }).unwrap();
    } catch (error) {
      console.error('Cart quantity update failed:', error);
    }
  };

  const removeItem = async (productId: string) => {
    try {
      await removeCartItem(productId).unwrap();
      setSelectedIds(current => current.filter(id => id !== productId));
    } catch (error) {
      console.error('Remove cart item failed:', error);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={colors.black} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load your cart</Text>
          <Text style={styles.errorText}>
            Please check your internet connection and try again.
          </Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => {
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('Home');
            }
          }}
        >
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>

        <Text style={styles.headerTitle}>My Cart</Text>

        {items.length > 0 ? (
          <Pressable
            onPress={() => setVoucherVisible(true)}
            style={styles.voucherButton}
          >
            <Text style={styles.voucherText}>Voucher Code</Text>
          </Pressable>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {items.length === 0 ? (
        <EmptyCart />
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {isFetching && (
              <View style={styles.refreshingRow}>
                <ActivityIndicator size="small" color={colors.cyan} />
              </View>
            )}

            {items.map(item => {
              const product = item.product;
              if (!product) return null;

              const productId = product._id;
              const currentPrice = product.discountPrice ?? product.price;
              const selected = selectedIds.includes(productId);

              return (
                <View key={productId} style={styles.cartItem}>
                  <View style={styles.imageBox}>
                    {product.image ? (
                      <Image
                        source={{ uri: product.image }}
                        style={styles.productImage}
                        resizeMode="cover"
                      />
                    ) : null}
                  </View>

                  <View style={styles.productDetails}>
                    <View style={styles.nameRow}>
                      <Text style={styles.productName} numberOfLines={2}>
                        {product.name}
                      </Text>

                      <Pressable
                        style={[
                          styles.checkbox,
                          selected && styles.checkboxSelected,
                        ]}
                        onPress={() => toggleSelection(productId)}
                      >
                        {selected ? (
                          <Text style={styles.checkmark}>✓</Text>
                        ) : null}
                      </Pressable>
                    </View>

                    <Text style={styles.currentPrice}>
                      ₹{currentPrice.toFixed(2)}
                    </Text>

                    {product.discountPrice != null &&
                      product.discountPrice < product.price && (
                        <Text style={styles.originalPrice}>
                          ₹{product.price.toFixed(2)}
                        </Text>
                      )}

                    <View style={styles.itemBottomRow}>
                      <View style={styles.quantityBox}>
                        <Pressable
                          style={styles.quantityButton}
                          onPress={() =>
                            changeQuantity(item, item.quantity - 1)
                          }
                        >
                          <Text style={styles.quantitySymbol}>−</Text>
                        </Pressable>

                        <Text style={styles.quantity}>{item.quantity}</Text>

                        <Pressable
                          style={styles.quantityButton}
                          onPress={() =>
                            changeQuantity(item, item.quantity + 1)
                          }
                        >
                          <Text style={styles.quantitySymbol}>+</Text>
                        </Pressable>
                      </View>

                      <Pressable
                        style={styles.deleteButton}
                        onPress={() => removeItem(productId)}
                      >
                        <Text style={styles.deleteIcon}>♧</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })}

            <View style={styles.orderInfo}>
              <Text style={styles.orderInfoTitle}>Order Info</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Subtotal</Text>
                <Text style={styles.infoValue}>₹{subtotal.toFixed(2)}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Shipping Cost</Text>
                <Text style={styles.infoValue}>₹{shippingCost.toFixed(2)}</Text>
              </View>

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.checkoutContainer}>
            <Pressable
              style={[
                styles.checkoutButton,
                selectedItems.length === 0 && styles.checkoutDisabled,
              ]}
              disabled={selectedItems.length === 0}
              onPress={() => {
                // Checkout screen will be connected here next.
              }}
            >
              <Text style={styles.checkoutText}>
                Checkout ({selectedItems.length})
              </Text>
            </Pressable>
          </View>
        </>
      )}

      <Modal
        visible={voucherVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setVoucherVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setVoucherVisible(false)}
          />

          <View style={styles.voucherSheet}>
            <View style={styles.sheetHandle} />

            <Text style={styles.sheetTitle}>Voucher Code</Text>

            <TextInput
              value={voucherCode}
              onChangeText={setVoucherCode}
              placeholder="Enter Voucher Code"
              placeholderTextColor="#B9BBC4"
              autoCapitalize="characters"
              style={styles.voucherInput}
            />

            <Pressable
              style={styles.applyButton}
              onPress={() => {
                // Voucher validation API will be connected here.
                setVoucherVisible(false);
              }}
            >
              <Text style={styles.applyText}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 36,
    lineHeight: 36,
    color: colors.black,
    fontWeight: '300',
  },
  headerTitle: {
    ...typography.body1Medium,
    color: colors.black,
  },
  voucherButton: {
    marginLeft: 'auto',
  },
  voucherText: {
    ...typography.body2Medium,
    color: colors.cyan,
  },
  headerSpacer: {
    marginLeft: 'auto',
    width: 80,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: 20,
  },
  refreshingRow: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItem: {
    flexDirection: 'row',
    paddingVertical: spacing.sm,
  },
  imageBox: {
    width: 120,
    height: 120,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#F1F3F4',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productDetails: {
    flex: 1,
    marginLeft: spacing.sm,
    paddingVertical: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  productName: {
    ...typography.body2Regular,
    color: colors.black,
    flex: 1,
    paddingRight: spacing.xs,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#D9DCE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  checkboxSelected: {
    backgroundColor: colors.cyan,
    borderColor: colors.cyan,
  },
  checkmark: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  currentPrice: {
    ...typography.body2Medium,
    color: colors.black,
    marginTop: 5,
  },
  originalPrice: {
    ...typography.captionRegular,
    color: colors.grey150,
    textDecorationLine: 'line-through',
    marginTop: 1,
  },
  itemBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
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
  quantitySymbol: {
    fontSize: 21,
    color: colors.black,
  },
  quantity: {
    ...typography.body2Medium,
    color: colors.black,
    minWidth: 25,
    textAlign: 'center',
  },
  deleteButton: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIcon: {
    fontSize: 22,
    color: colors.red,
    transform: [{ rotate: '180deg' }],
  },
  orderInfo: {
    marginTop: 38,
    paddingBottom: 12,
  },
  orderInfoTitle: {
    ...typography.body1Medium,
    color: colors.black,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  infoLabel: {
    ...typography.captionRegular,
    color: colors.grey150,
  },
  infoValue: {
    ...typography.captionRegular,
    color: colors.grey150,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  totalLabel: {
    ...typography.body1Medium,
    color: colors.black,
  },
  totalValue: {
    ...typography.body1Medium,
    color: colors.black,
  },
  checkoutContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: 10,
    paddingBottom: spacing.md,
    backgroundColor: colors.white,
  },
  checkoutButton: {
    height: 61,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutDisabled: {
    opacity: 0.5,
  },
  checkoutText: {
    ...typography.body2Medium,
    color: colors.white,
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  errorTitle: {
    ...typography.body1Medium,
    color: colors.black,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body2Regular,
    color: colors.grey150,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    height: 48,
    paddingHorizontal: 28,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    ...typography.body2Medium,
    color: colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    justifyContent: 'flex-end',
  },
  voucherSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 64,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EDEEF3',
    alignSelf: 'center',
    marginBottom: 28,
  },
  sheetTitle: {
    ...typography.body1Medium,
    color: colors.black,
    marginBottom: 18,
  },
  voucherInput: {
    height: 58,
    borderWidth: 1,
    borderColor: '#E8EAF1',
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    ...typography.body2Regular,
    color: colors.black,
  },
  applyButton: {
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  applyText: {
    ...typography.body2Medium,
    color: colors.white,
  },
});

export default CartScreen;

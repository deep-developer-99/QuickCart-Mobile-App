import { AppText as Text } from '../../components/AppText';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  type Address,
  useGetAddressesQuery,
} from '../../api/addressApi';
import AddAddressModal from '../../components/AddAddressModal';
import BackButton from '../../components/common/BackButton';
import {
  useCreateBuyNowOrderMutation,
  useCreateOrderMutation,
} from '../../api/orderApi';
import {
  useCreateCashfreeSessionMutation,
  useVerifyCashfreePaymentMutation,
} from '../../api/cashfreePaymentApi';
import { startCashfreeTransaction } from '../../services/cashfreePaymentService';
import {
  type CartItem,
  useClearCartMutation,
  useGetCartQuery,
} from '../../api/quickCartApi';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import OrderSuccessIllustration from '../../assets/checkout/order-success.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

type Step = 'shipping' | 'payment' | 'review' | 'success';
type PaymentMethod =
  | 'COD'
  | 'UPI_GPAY'
  | 'UPI_PHONEPE'
  | 'UPI_PAYTM'
  | 'UPI_OTHER'
  | 'CARD'
  | 'WALLET';

export default function CheckoutScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  const styles = useStyles();
  const checkoutMode = route.params?.mode ?? 'cart';
  const buyNowProduct = route.params?.product;
  const buyNowQuantity = route.params?.quantity ?? 1;
  const isBuyNow = checkoutMode === 'buyNow';

  const { data: cartResponse, isLoading: cartLoading } = useGetCartQuery(
    undefined,
    { skip: isBuyNow },
  );
  const { data: addressResponse, isLoading: addressLoading, refetch: refetchAddresses } =
    useGetAddressesQuery();
  const [createOrder, { isLoading: placingCartOrder }] =
    useCreateOrderMutation();
  const [createBuyNowOrder, { isLoading: placingBuyNowOrder }] =
    useCreateBuyNowOrderMutation();
  const [clearCart] = useClearCartMutation();
  const [createCashfreeSession, { isLoading: creatingCashfreeSession }] =
    useCreateCashfreeSessionMutation();
  const [verifyCashfreePayment, { isLoading: verifyingCashfreePayment }] =
    useVerifyCashfreePaymentMutation();

  const items: CartItem[] = isBuyNow
    ? buyNowProduct
      ? [
          {
            product: buyNowProduct,
            quantity: buyNowQuantity,
          } as CartItem,
        ]
      : []
    : cartResponse?.data?.items ?? [];

  const addresses: Address[] = addressResponse?.data ?? [];
  const placingOrder =
    placingCartOrder ||
    placingBuyNowOrder ||
    creatingCashfreeSession ||
    verifyingCashfreePayment;

  const [step, setStep] = useState<Step>('shipping');
  const [addressId, setAddressId] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('COD');
  const isOnlinePayment = payment !== 'COD';

  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.discountPrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const shipping = subtotal > 0 && subtotal <= 99 ? 40 : 0;
  const total = subtotal + shipping;

  const selectedAddress = addresses.find(address => address._id === addressId);

  const selectAddress = (address: Address) => {
    setAddressId(address._id);
    setStep('payment');
  };

  const placeOrder = async () => {
    if (!addressId) {
      Alert.alert(
        t('ui.checkout.selectAddress'),
        t('ui.checkout.selectAddressMessage'),
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert(
        isBuyNow ? t('ui.checkout.productUnavailable') : t('ui.checkout.emptyCart'),
        isBuyNow
          ? t('ui.checkout.productUnavailableMessage')
          : t('ui.checkout.emptyCartMessage'),
      );
      return;
    }

    try {
      if (isOnlinePayment) {
        if (isBuyNow && !buyNowProduct) {
          Alert.alert(
            t('ui.checkout.productUnavailable'),
            t('ui.checkout.unableToCheckout'),
          );
          return;
        }

        const session = await createCashfreeSession({
          addressId,
          checkoutMode: isBuyNow ? 'buyNow' : 'cart',
          paymentMethod: payment as Exclude<PaymentMethod, 'COD'>,
          ...(isBuyNow
            ? {
                productId: buyNowProduct!._id,
                quantity: buyNowQuantity,
              }
            : {}),
        }).unwrap();

        // Cashfree's SDK callback is not proof of payment. Always verify with our backend.
        try {
          await startCashfreeTransaction(session.data);
        } catch (sdkError) {
          // The app can return an error even when the provider transaction is
          // still processing. Check the server status before deciding.
          console.warn(
            'Cashfree SDK returned without a confirmed result:',
            sdkError,
          );
        }

        const verification = await verifyCashfreePayment({
          paymentId: session.data.paymentId,
        }).unwrap();

        if (verification.data.status === 'paid') {
          // The backend finalizes the order and clears the unchanged cart transactionally.
          // Do not clear the cart again on the client: the customer may have changed it.
          setStep('success');
          return;
        }

        if (verification.data.status === 'paid_needs_review') {
          Alert.alert(
            t('ui.checkout.paymentReceived'),
            t('ui.checkout.paymentReview'),
          );
          return;
        }

        if (verification.data.status === 'pending') {
          Alert.alert(
            t('ui.checkout.paymentProcessing'),
            t('ui.checkout.paymentPending'),
          );
          return;
        }

        Alert.alert(
          t('ui.checkout.paymentNotCompleted'),
          t('ui.checkout.paymentNotConfirmed'),
        );
        return;
      }

      if (isBuyNow) {
        if (!buyNowProduct) {
          Alert.alert(
            t('ui.checkout.productUnavailable'),
            t('ui.checkout.unableToCheckout'),
          );
          return;
        }

        await createBuyNowOrder({
          productId: buyNowProduct._id,
          quantity: buyNowQuantity,
          addressId,
          paymentMethod: 'COD',
        }).unwrap();
        // Buy Now is independent from the cart; never clear the cart here.
      } else {
        await createOrder({ addressId, paymentMethod: 'COD' }).unwrap();
        try {
          await clearCart().unwrap();
        } catch (clearError) {
          console.error('Cart cleanup after order failed:', clearError);
        }
      }

      setStep('success');
    } catch (error: any) {
      Alert.alert(
        isOnlinePayment ? t('ui.checkout.paymentStatusUnavailable') : t('ui.checkout.orderFailed'),
        error?.data?.message ??
          (isOnlinePayment
            ? t('ui.checkout.paymentCheckAgain')
            : t('ui.checkout.unableToPlaceOrder')),
      );
    }
  };

  const goBack = () => {
    if (step === 'shipping') {
      navigation.goBack();
      return;
    }

    if (step === 'payment') {
      setStep('shipping');
      return;
    }

    if (step === 'review') {
      setStep('payment');
    }
  };

  if (cartLoading || addressLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>{t('ui.checkout.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <ScrollView
          contentContainerStyle={styles.success}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.successIllustrationContainer}>
            <View style={styles.successArtwork}>
              <OrderSuccessIllustration
                width="100%"
                height="100%"
                style={styles.successIllustration}
                accessible
                accessibilityRole="image"
                accessibilityLabel={t('ui.checkout.successIllustrationAlt')}
              />
            </View>
          </View>

          <Text style={styles.successTitle}>
            {t('ui.checkout.successTitle')}
          </Text>

          <Text style={styles.successText}>
            {t('ui.checkout.successMessage')}
          </Text>

          <Pressable
            style={styles.successButton}
            onPress={() =>
              navigation.replace('MainTabs', { screen: 'Categories' })
            }
            accessibilityRole="button"
          >
            <Text style={styles.successButtonText}>
              {t('ui.checkout.continueShopping')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const currentStep = step === 'shipping' ? 0 : step === 'payment' ? 1 : 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title={t('ui.checkout.title')} onBack={goBack} />

      <Steps
        current={currentStep}
        onPress={index => {
          if (index === 0) {
            setStep('shipping');
          } else if (index === 1 && addressId) {
            setStep('payment');
          } else if (index === 2 && addressId) {
            setStep('review');
          }
        }}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {step === 'shipping' && (
          <>
            <SectionTitle title={t('ui.checkout.shippingAddress')} />

            {addresses.map(address => (
              <AddressCard
                key={address._id}
                address={address}
                selected={addressId === address._id}
                onPress={() => selectAddress(address)}
              />
            ))}
            <Button
              title={t('ui.checkout.addNewAddress')}
              onPress={() => setAddressModalOpen(true)}
            />
          </>
        )}

        {step === 'payment' && (
          <>
            <SectionTitle title={t('ui.checkout.payment')} />

            <View style={styles.paymentSection}>
              <Text style={styles.paymentGroupTitle}>{t('ui.checkout.upi')}</Text>
              <Text style={styles.paymentGroupSubtitle}>
                {t('ui.checkout.chooseUpi')}
              </Text>

              <View style={styles.upiGrid}>
                <UpiAppCard
                  title="Google Pay"
                  shortLabel="G"
                  selected={payment === 'UPI_GPAY'}
                  onPress={() => setPayment('UPI_GPAY')}
                  color="#4285F4"
                />
                <UpiAppCard
                  title="PhonePe"
                  shortLabel="पे"
                  selected={payment === 'UPI_PHONEPE'}
                  onPress={() => setPayment('UPI_PHONEPE')}
                  color="#5F259F"
                />
                <UpiAppCard
                  title="Paytm"
                  shortLabel="P"
                  selected={payment === 'UPI_PAYTM'}
                  onPress={() => setPayment('UPI_PAYTM')}
                  color="#00A5E5"
                />
              </View>

              <MethodRow
                title={t('ui.checkout.payOtherUpi')}
                subtitle={t('ui.checkout.secureUpi')}
                icon="↗"
                selected={payment === 'UPI_OTHER'}
                onPress={() => setPayment('UPI_OTHER')}
              />
            </View>

            <View style={styles.paymentSection}>
              <Text style={styles.paymentGroupTitle}>
                {t('ui.checkout.otherMethods')}
              </Text>
              <MethodRow
                title={t('ui.checkout.cards')}
                subtitle={t('ui.checkout.supportedCards')}
                icon="▤"
                selected={payment === 'CARD'}
                onPress={() => setPayment('CARD')}
              />
              <MethodRow
                title={t('ui.checkout.wallet')}
                subtitle={t('ui.checkout.supportedWallet')}
                icon="▣"
                selected={payment === 'WALLET'}
                onPress={() => setPayment('WALLET')}
              />
              <MethodRow
                title={t('ui.checkout.cashOnDelivery')}
                subtitle={t('ui.checkout.payWhenArrives')}
                icon="₹"
                selected={payment === 'COD'}
                onPress={() => setPayment('COD')}
              />
            </View>

            {isOnlinePayment && (
              <Text style={styles.paymentNotice}>{t('ui.checkout.onlineNotice')}</Text>
            )}

            <Summary
              items={items}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
            />

            <Button title={t('ui.checkout.continue')} onPress={() => setStep('review')} />
          </>
        )}

        {step === 'review' && (
          <>
            <SectionTitle title={t('ui.checkout.reviewOrder')} />

            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>{t('ui.checkout.shippingAddress')}</Text>

              {selectedAddress ? (
                <>
                  <Text style={styles.reviewValue}>
                    {selectedAddress.fullName}
                  </Text>
                  <Text style={styles.reviewText}>{selectedAddress.phone}</Text>
                  <Text style={styles.reviewText}>
                    {selectedAddress.addressLine}
                  </Text>
                  <Text style={styles.reviewText}>
                    {selectedAddress.city}, {selectedAddress.state} -{' '}
                    {selectedAddress.pincode}
                  </Text>
                </>
              ) : (
                <Text style={styles.muted}>{t('ui.checkout.noAddress')}</Text>
              )}
            </View>

            <Summary
              items={items}
              subtotal={subtotal}
              shipping={shipping}
              total={total}
            />

            <Button
              title={
                placingOrder
                  ? isOnlinePayment
                    ? t('ui.checkout.processingPayment')
                    : t('ui.checkout.placingOrder')
                  : isOnlinePayment
                  ? t('ui.checkout.payAmount', { amount: total.toFixed(2) })
                  : t('ui.checkout.placeOrder')
              }
              disabled={placingOrder}
              onPress={placeOrder}
            />
          </>
        )}
      </ScrollView>

      <AddAddressModal
        visible={addressModalOpen}
        hasExistingAddresses={addresses.length > 0}
        onClose={() => setAddressModalOpen(false)}
        onSaved={async address => {
          const refreshed = await refetchAddresses();
          const savedAddress = refreshed.data?.data.find(
            item => item._id === address._id,
          );
          setAddressId(savedAddress?._id ?? address._id);
          setStep('payment');
        }}
      />
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  const styles = useStyles();
  return (
    <View style={styles.header}>
      <BackButton onPress={onBack} style={styles.back} />
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerSpacer} />
    </View>
  );
}

function Steps({
  current,
  onPress,
}: {
  current: number;
  onPress: (index: number) => void;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const labels = [t('ui.checkout.shippingAddress'), t('ui.checkout.payment'), t('ui.checkout.reviewOrder')];

  return (
    <View style={styles.steps}>
      {labels.map((label, index) => (
        <React.Fragment key={label}>
          <Pressable onPress={() => onPress(index)} style={styles.step}>
            <View
              style={[
                styles.circle,
                index === current && styles.circleCurrent,
                index < current && styles.circleDone,
              ]}
            >
              <Text
                style={[
                  styles.circleText,
                  index <= current && styles.circleTextActive,
                ]}
              >
                {index < current ? '✓' : index + 1}
              </Text>
            </View>

            <Text
              style={[
                styles.stepLabel,
                index === current && styles.currentLabel,
                index < current && styles.doneLabel,
              ]}
            >
              {label}
            </Text>
          </Pressable>

          {index < labels.length - 1 && (
            <View style={[styles.line, index < current && styles.doneLine]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  const styles = useStyles();
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function AddressCard({
  address,
  selected,
  onPress,
}: {
  address: Address;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.address, selected && styles.addressSelected]}
    >
      <View style={styles.radio}>
        {selected && <View style={styles.radioInner} />}
      </View>

      <View style={styles.addressContent}>
        <Text style={styles.addressName}>{address.fullName}</Text>
        <Text style={styles.addressText}>{address.phone}</Text>
        <Text style={styles.addressText}>
          {address.addressLine}, {address.city}
        </Text>
        <Text style={styles.addressText}>
          {address.state} - {address.pincode}
        </Text>
      </View>
    </Pressable>
  );
}

function UpiAppCard({
  title,
  shortLabel,
  selected,
  onPress,
  color,
}: {
  title: string;
  shortLabel: string;
  selected: boolean;
  onPress: () => void;
  color: string;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.upiAppCard, selected && styles.paymentSelected]}
    >
      <View style={[styles.upiAppIcon, { backgroundColor: color }]}>
        <Text style={styles.upiAppIconText}>{shortLabel}</Text>
      </View>
      <Text numberOfLines={1} style={styles.upiAppTitle}>
        {title}
      </Text>
      <View style={[styles.smallRadio, selected && styles.smallRadioSelected]}>
        {selected && <View style={styles.smallRadioInner} />}
      </View>
    </Pressable>
  );
}

function MethodRow({
  title,
  subtitle,
  icon,
  selected,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  selected: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.methodRow, selected && styles.paymentSelected]}
    >
      <View style={styles.methodIcon}>
        <Text style={styles.methodIconText}>{icon}</Text>
      </View>
      <View style={styles.paymentText}>
        <Text style={styles.paymentTitle}>{title}</Text>
        <Text style={styles.paymentSub}>{subtitle}</Text>
      </View>
      <View style={styles.radio}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

function Summary({
  items,
  subtotal,
  shipping,
  total,
}: {
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}) {
  const { t } = useTranslation();
  const styles = useStyles();
  const originalSubtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const discount = Math.max(0, originalSubtotal - subtotal);

  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>{t('ui.checkout.orderInfo')}</Text>

      {items.length > 0 ? (
        <View style={styles.orderItems}>
          {items.map(item => {
            const unitPrice = item.product.discountPrice ?? item.product.price;
            const itemTotal = unitPrice * item.quantity;
            const imageUri = item.product.image || item.product.images?.[0];

            return (
              <View key={item.product._id} style={styles.orderItem}>
                <View style={styles.orderItemImageBox}>
                  {imageUri ? (
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.orderItemImage}
                      accessibilityLabel={`${item.product.name} thumbnail`}
                    />
                  ) : (
                    <Text style={styles.orderItemPlaceholder}>🛍️</Text>
                  )}
                </View>
                <View style={styles.orderItemDetails}>
                  <Text numberOfLines={2} style={styles.orderItemName}>
                    {item.product.name || t('ui.checkout.productUnavailableItem')}
                  </Text>
                  <Text style={styles.orderItemMeta}>
                    {t('ui.checkout.qtyEach', { count: item.quantity, price: unitPrice.toFixed(2) })}
                  </Text>
                </View>
                <Text style={styles.orderItemTotal}>₹{itemTotal.toFixed(2)}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={[styles.muted, styles.orderItemsEmpty]}>
          {t('ui.checkout.noItems')}
        </Text>
      )}

      <Row label={t('ui.checkout.subtotal')} value={`₹${subtotal.toFixed(2)}`} />

      {discount > 0 ? (
        <Row label={t('ui.checkout.discount')} value={`-₹${discount.toFixed(2)}`} />
      ) : null}

      <Row label={t('ui.checkout.shippingCost')} value={`₹${shipping.toFixed(2)}`} />

      <View style={styles.total}>
        <Text style={styles.totalLabel}>{t('ui.checkout.total')}</Text>
        <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

function Button({
  title,
  onPress,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </Pressable>
  );
}

const createStyles = (colors: ThemeColors, mode: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      padding: 16,
      paddingBottom: 100,
    },

    header: {
      height: 56,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
    },

    back: {
      width: 36,
      height: 40,
      justifyContent: 'center',
    },

    backText: {
      fontSize: 36,
      color: colors.text,
      fontWeight: '300',
    },

    headerTitle: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },

    headerSpacer: {
      width: 36,
    },

    steps: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 14,
    },

    step: {
      width: 74,
      alignItems: 'center',
    },

    circle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.grey100,
      alignItems: 'center',
      justifyContent: 'center',
    },

    circleCurrent: {
      backgroundColor: colors.control,
      borderColor: colors.control,
    },

    circleDone: {
      backgroundColor: colors.cyan,
      borderColor: colors.cyan,
    },

    circleText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.grey150,
    },

    circleTextActive: {
      color: colors.white,
    },

    stepLabel: {
      fontSize: 11,
      color: colors.grey150,
      marginTop: 5,
    },

    currentLabel: {
      color: colors.text,
      fontWeight: '600',
    },

    doneLabel: {
      color: colors.cyan,
      fontWeight: '600',
    },

    line: {
      flex: 1,
      height: 1,
      backgroundColor: colors.grey100,
      marginBottom: 18,
    },

    doneLine: {
      backgroundColor: colors.cyan,
    },

    sectionTitle: {
      fontSize: 17,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 16,
    },

    address: {
      flexDirection: 'row',
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 10,
      backgroundColor: colors.surface,
    },

    addressSelected: {
      borderColor: colors.cyan,
      backgroundColor: colors.cyan50,
    },

    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.grey100,
      alignItems: 'center',
      justifyContent: 'center',
    },

    radioInner: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.cyan,
    },

    addressContent: {
      flex: 1,
      marginLeft: 12,
    },

    addressName: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 4,
    },

    addressText: {
      fontSize: 13,
      color: colors.grey150,
      lineHeight: 20,
    },

    addAddressTitle: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '600',
      marginTop: 10,
      marginBottom: 12,
    },

    field: {
      marginBottom: 14,
    },

    label: {
      fontSize: 13,
      color: colors.text,
      marginBottom: 7,
    },

    input: {
      height: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      color: colors.text,
      backgroundColor: colors.surface,
      fontSize: 14,
    },

    button: {
      height: 54,
      borderRadius: 12,
      backgroundColor: colors.cyan,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 10,
    },

    buttonDisabled: {
      opacity: 0.55,
    },

    buttonText: {
      color: colors.control,
      fontSize: 15,
      fontWeight: '600',
    },

    payment: {
      minHeight: 82,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 14,
      marginBottom: 12,
      backgroundColor: colors.surface,
    },

    paymentSelected: {
      borderColor: colors.cyan,
      backgroundColor: colors.cyan50,
    },

    paymentSection: {
      marginBottom: 18,
    },

    paymentGroupTitle: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '700',
      marginBottom: 4,
    },

    paymentGroupSubtitle: {
      fontSize: 12,
      color: colors.grey150,
      marginBottom: 12,
    },

    upiGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },

    upiAppCard: {
      width: '31.5%',
      minHeight: 112,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 6,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
    },

    upiAppIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },

    upiAppIconText: {
      color: colors.white,
      fontSize: 21,
      fontWeight: '800',
    },

    upiAppTitle: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '600',
      marginBottom: 8,
    },

    smallRadio: {
      width: 16,
      height: 16,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.grey100,
      alignItems: 'center',
      justifyContent: 'center',
    },

    smallRadioSelected: {
      borderColor: colors.cyan,
    },

    smallRadioInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.cyan,
    },

    methodRow: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      backgroundColor: colors.surface,
    },

    methodIcon: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.cyan50,
      alignItems: 'center',
      justifyContent: 'center',
    },

    methodIconText: {
      color: colors.cyan,
      fontSize: 21,
      fontWeight: '700',
    },

    paymentNotice: {
      fontSize: 12,
      lineHeight: 18,
      color: colors.grey150,
      marginBottom: 8,
      paddingHorizontal: 2,
    },

    paymentIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.cyan50,
      alignItems: 'center',
      justifyContent: 'center',
    },

    paymentIconText: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.cyan,
    },

    paymentText: {
      flex: 1,
      marginLeft: 12,
    },

    paymentTitle: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
    },

    paymentSub: {
      fontSize: 11,
      color: colors.grey150,
      marginTop: 4,
    },

    summary: {
      marginTop: 20,
      marginBottom: 10,
    },

    summaryTitle: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 14,
    },

    orderItems: {
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 10,
      backgroundColor: colors.surface,
    },

    orderItemsEmpty: {
      marginBottom: 14,
      paddingVertical: 8,
    },

    orderItem: {
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 6,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },

    orderItemImageBox: {
      width: 56,
      height: 56,
      borderRadius: 8,
      backgroundColor: colors.cyan50,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },

    orderItemImage: {
      width: '100%',
      height: '100%',
    },

    orderItemPlaceholder: {
      fontSize: 20,
    },

    orderItemDetails: {
      flex: 1,
      minWidth: 0,
      marginHorizontal: 10,
    },

    orderItemName: {
      fontSize: 12,
      lineHeight: 17,
      color: colors.text,
      fontWeight: '600',
    },

    orderItemMeta: {
      marginTop: 4,
      fontSize: 11,
      color: colors.grey150,
    },

    orderItemTotal: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '600',
    },

    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 11,
    },

    muted: {
      fontSize: 12,
      color: colors.grey150,
    },

    value: {
      fontSize: 12,
      color: colors.grey150,
    },

    total: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 14,
    },

    totalLabel: {
      fontSize: 16,
      color: colors.text,
      fontWeight: '600',
    },

    totalValue: {
      fontSize: 17,
      color: colors.text,
      fontWeight: '600',
    },

    reviewCard: {
      padding: 14,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 18,
      backgroundColor: colors.surface,
    },

    reviewLabel: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 8,
    },

    reviewValue: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '600',
      marginBottom: 3,
    },

    reviewText: {
      fontSize: 13,
      color: colors.grey150,
      lineHeight: 20,
    },

    success: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 460,
      alignSelf: 'center',
      paddingHorizontal: 16,
      paddingTop: 20,
      paddingBottom: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    successIllustrationContainer: {
      width: '100%',
      maxWidth: 420,
      maxHeight: 408,
      aspectRatio: 0.8,
      borderRadius: 28,
      backgroundColor: mode === 'dark' ? colors.surface : colors.cyan50,
      alignItems: 'center',
      justifyContent: 'center',
    },

    successIllustration: {
      width: '100%',
      height: '100%',
    },

    successArtwork: {
      width: '66%',
      aspectRatio: 1,
    },

    successTitle: {
      fontSize: 24,
      lineHeight: 30,
      fontFamily: 'PlusJakartaSans-Bold',
      color: colors.text,
      textAlign: 'center',
      marginTop: 24,
    },

    successText: {
      fontSize: 13,
      lineHeight: 21,
      fontFamily: 'PlusJakartaSans-Regular',
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 14,
    },

    successButton: {
      width: '100%',
      minHeight: 60,
      borderRadius: 12,
      backgroundColor: mode === 'dark' ? colors.cyan : colors.black,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 24,
    },

    successButtonText: {
      color: colors.white,
      fontSize: 14,
      fontFamily: 'PlusJakartaSans-SemiBold',
    },

    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

const useStyles = () => {
  const { theme, mode } = useTheme();
  return React.useMemo(
    () => createStyles(theme.colors, mode),
    [theme.colors, mode],
  );
};

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  type Address,
  type CreateAddressData,
  useCreateAddressMutation,
  useGetAddressesQuery,
} from '../../api/addressApi';
import { useCreateOrderMutation } from '../../api/orderApi';
import { type CartItem, useGetCartQuery } from '../../api/quickCartApi';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Checkout'>;

type Step = 'shipping' | 'payment' | 'review' | 'items' | 'success';
type PaymentMethod = 'COD' | 'RAZORPAY_FAKE';

const GREEN = '#21D4B4';
const BLACK = '#1C1C1C';
const GREY = '#6F7384';
const BORDER = '#ECEEF4';

export default function CheckoutScreen({ navigation }: Props) {
  const { data: cartResponse, isLoading: cartLoading } = useGetCartQuery();
  const { data: addressResponse, isLoading: addressLoading } =
    useGetAddressesQuery();

  const [createAddress, { isLoading: savingAddress }] =
    useCreateAddressMutation();
  const [createOrder, { isLoading: placingOrder }] = useCreateOrderMutation();

  const items: CartItem[] = cartResponse?.data?.items ?? [];
  const addresses: Address[] = addressResponse?.data ?? [];

  const [step, setStep] = useState<Step>('shipping');
  const [addressId, setAddressId] = useState('');
  const [payment, setPayment] = useState<PaymentMethod>('COD');

  const [form, setForm] = useState<CreateAddressData>({
    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
    isDefault: false,
  });

  const subtotal = items.reduce((sum, item) => {
    const price = item.product.discountPrice ?? item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const shipping = subtotal === 0 || subtotal >= 500 ? 0 : 40;
  const total = subtotal + shipping;

  const selectedAddress = addresses.find(address => address._id === addressId);

  const updateField = (name: keyof CreateAddressData, value: string) => {
    setForm(previous => ({
      ...previous,
      [name]: value,
    }));
  };

  const selectAddress = (address: Address) => {
    setAddressId(address._id);
    setStep('payment');
  };

  const saveAddress = async () => {
    const requiredFields: Array<keyof CreateAddressData> = [
      'fullName',
      'phone',
      'addressLine',
      'city',
      'state',
      'pincode',
    ];

    const missing = requiredFields.some(
      field => !String(form[field] ?? '').trim(),
    );

    if (missing) {
      Alert.alert(
        'Missing information',
        'Please fill all required address fields.',
      );
      return;
    }

    if (!/^\+?[0-9]{10,15}$/.test(form.phone.trim())) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      Alert.alert('Invalid pincode', 'Please enter a valid 6-digit pincode.');
      return;
    }

    try {
      const response = await createAddress({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
      }).unwrap();

      setAddressId(response.data._id);
      setStep('payment');
    } catch (error: any) {
      Alert.alert(
        'Address error',
        error?.data?.message ?? 'Unable to save address.',
      );
    }
  };

  const placeOrder = async () => {
    if (!addressId) {
      Alert.alert(
        'Select address',
        'Please select or save a delivery address.',
      );
      return;
    }

    if (items.length === 0) {
      Alert.alert('Empty cart', 'Your cart is empty.');
      return;
    }

    try {
      await createOrder({
        addressId,
        paymentMethod: payment,
      }).unwrap();

      setStep('success');
    } catch (error: any) {
      Alert.alert(
        'Order failed',
        error?.data?.message ?? 'Unable to place order.',
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

    if (step === 'review' || step === 'items') {
      setStep('payment');
    }
  };

  if (cartLoading || addressLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.muted}>Loading checkout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'success') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title="Checkout" onBack={() => navigation.goBack()} />

        <View style={styles.success}>
          <View style={styles.successBox}>
            <Text style={styles.successMark}>✓</Text>
          </View>

          <Text style={styles.successTitle}>
            Your order has been{'\n'}placed successfully
          </Text>

          <Text style={styles.successText}>
            Thank you for choosing us! Feel free to continue shopping and
            explore our wide range of products. Happy Shopping!
          </Text>

          <Button
            title="Continue Shopping"
            onPress={() => navigation.replace('MainTabs', { screen: 'Home' })}
          />
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'items') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Header title={`Items (${items.length})`} onBack={goBack} />
        <Items items={items} />
      </SafeAreaView>
    );
  }

  const currentStep = step === 'shipping' ? 0 : step === 'payment' ? 1 : 2;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Header title="Checkout" onBack={goBack} />

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
            <SectionTitle title="Shipping Address" />

            {addresses.map(address => (
              <AddressCard
                key={address._id}
                address={address}
                selected={addressId === address._id}
                onPress={() => selectAddress(address)}
              />
            ))}

            <Text style={styles.addAddressTitle}>
              {addresses.length > 0
                ? 'Add New Address'
                : 'Enter Shipping Address'}
            </Text>

            <Field
              label="Full Name"
              value={form.fullName}
              placeholder="Enter full name"
              onChange={value => updateField('fullName', value)}
            />

            <Field
              label="Phone Number"
              value={form.phone}
              placeholder="Enter phone number"
              keyboard="phone-pad"
              onChange={value => updateField('phone', value)}
            />

            <Field
              label="Street Address"
              value={form.addressLine}
              placeholder="Enter street address"
              onChange={value => updateField('addressLine', value)}
            />

            <Field
              label="Province / State"
              value={form.state}
              placeholder="Enter state"
              onChange={value => updateField('state', value)}
            />

            <Field
              label="City"
              value={form.city}
              placeholder="Enter city"
              onChange={value => updateField('city', value)}
            />

            <Field
              label="Postal Code"
              value={form.pincode}
              placeholder="Enter postal code"
              keyboard="number-pad"
              onChange={value => updateField('pincode', value)}
            />

            <Button
              title={savingAddress ? 'Saving...' : 'Save Address'}
              disabled={savingAddress}
              onPress={saveAddress}
            />
          </>
        )}

        {step === 'payment' && (
          <>
            <SectionTitle title="Payment" />

            <Payment
              title="Cash on Delivery"
              subtitle="Pay when your order arrives"
              selected={payment === 'COD'}
              onPress={() => setPayment('COD')}
              icon="₹"
            />

            <Payment
              title="Card / UPI"
              subtitle="Demo Razorpay payment"
              selected={payment === 'RAZORPAY_FAKE'}
              onPress={() => setPayment('RAZORPAY_FAKE')}
              icon="G"
            />

            <Summary subtotal={subtotal} shipping={shipping} total={total} />

            <Button title="Continue" onPress={() => setStep('review')} />
          </>
        )}

        {step === 'review' && (
          <>
            <SectionTitle title="Review Order" />

            <Pressable
              style={styles.itemsLink}
              onPress={() => setStep('items')}
            >
              <Text style={styles.itemsLinkTitle}>Items ({items.length})</Text>
              <Text style={styles.arrow}>›</Text>
            </Pressable>

            <View style={styles.reviewCard}>
              <Text style={styles.reviewLabel}>Shipping Address</Text>

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
                <Text style={styles.muted}>No address selected.</Text>
              )}
            </View>

            <Summary subtotal={subtotal} shipping={shipping} total={total} />

            <Button
              title={placingOrder ? 'Placing Order...' : 'Place Order'}
              disabled={placingOrder}
              onPress={placeOrder}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.back}>
        <Text style={styles.backText}>‹</Text>
      </Pressable>
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
  const labels = ['Shipping', 'Payment', 'Review'];

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
  return <Text style={styles.sectionTitle}>{title}</Text>;
}

function Field({
  label,
  value,
  placeholder,
  onChange,
  keyboard = 'default',
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  keyboard?: 'default' | 'phone-pad' | 'number-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#B7BAC4"
        onChangeText={onChange}
        keyboardType={keyboard}
        style={styles.input}
      />
    </View>
  );
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

function Payment({
  title,
  subtitle,
  selected,
  onPress,
  icon,
}: {
  title: string;
  subtitle: string;
  selected: boolean;
  onPress: () => void;
  icon: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.payment, selected && styles.paymentSelected]}
    >
      <View style={styles.paymentIcon}>
        <Text style={styles.paymentIconText}>{icon}</Text>
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
  subtotal,
  shipping,
  total,
}: {
  subtotal: number;
  shipping: number;
  total: number;
}) {
  return (
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Order Info</Text>

      <Row label="Subtotal" value={`₹${subtotal.toFixed(2)}`} />

      <Row label="Shipping Cost" value={`₹${shipping.toFixed(2)}`} />

      <View style={styles.total}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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

function Items({ items }: { items: CartItem[] }) {
  if (items.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>No items in your cart.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.itemsContent}
    >
      {items.map(item => {
        const price = item.product.discountPrice ?? item.product.price;

        return (
          <View key={item.product._id} style={styles.item}>
            <View style={styles.itemImageBox}>
              {item.product.image ? (
                <Image
                  source={{ uri: item.product.image }}
                  style={styles.itemImage}
                />
              ) : (
                <Text>🛍️</Text>
              )}
            </View>

            <View style={styles.itemInfo}>
              <Text numberOfLines={2} style={styles.itemName}>
                {item.product.name}
              </Text>

              <Text style={styles.itemPrice}>₹{price.toFixed(2)}</Text>

              <Text style={styles.qty}>Quantity: {item.quantity}</Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F0F1F5',
  },

  back: {
    width: 36,
    height: 40,
    justifyContent: 'center',
  },

  backText: {
    fontSize: 36,
    color: BLACK,
    fontWeight: '300',
  },

  headerTitle: {
    flex: 1,
    fontSize: 16,
    color: BLACK,
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
    borderColor: '#B8BDC8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  circleCurrent: {
    backgroundColor: BLACK,
    borderColor: BLACK,
  },

  circleDone: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },

  circleText: {
    fontSize: 12,
    fontWeight: '600',
    color: GREY,
  },

  circleTextActive: {
    color: '#FFFFFF',
  },

  stepLabel: {
    fontSize: 11,
    color: GREY,
    marginTop: 5,
  },

  currentLabel: {
    color: BLACK,
    fontWeight: '600',
  },

  doneLabel: {
    color: GREEN,
    fontWeight: '600',
  },

  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#D5D8DE',
    marginBottom: 18,
  },

  doneLine: {
    backgroundColor: GREEN,
  },

  sectionTitle: {
    fontSize: 17,
    color: BLACK,
    fontWeight: '600',
    marginBottom: 16,
  },

  address: {
    flexDirection: 'row',
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginBottom: 10,
  },

  addressSelected: {
    borderColor: GREEN,
    backgroundColor: '#F4FFFC',
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#AEB3BE',
    alignItems: 'center',
    justifyContent: 'center',
  },

  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  addressContent: {
    flex: 1,
    marginLeft: 12,
  },

  addressName: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '600',
    marginBottom: 4,
  },

  addressText: {
    fontSize: 13,
    color: GREY,
    lineHeight: 20,
  },

  addAddressTitle: {
    fontSize: 15,
    color: BLACK,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 12,
  },

  field: {
    marginBottom: 14,
  },

  label: {
    fontSize: 13,
    color: BLACK,
    marginBottom: 7,
  },

  input: {
    height: 52,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    color: BLACK,
    fontSize: 14,
  },

  button: {
    height: 54,
    borderRadius: 12,
    backgroundColor: BLACK,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },

  buttonDisabled: {
    opacity: 0.55,
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  payment: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },

  paymentSelected: {
    borderColor: GREEN,
    backgroundColor: '#F4FFFC',
  },

  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2FBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  paymentIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#217C6D',
  },

  paymentText: {
    flex: 1,
    marginLeft: 12,
  },

  paymentTitle: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '600',
  },

  paymentSub: {
    fontSize: 11,
    color: GREY,
    marginTop: 4,
  },

  summary: {
    marginTop: 20,
    marginBottom: 10,
  },

  summaryTitle: {
    fontSize: 16,
    color: BLACK,
    fontWeight: '600',
    marginBottom: 14,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 11,
  },

  muted: {
    fontSize: 12,
    color: GREY,
  },

  value: {
    fontSize: 12,
    color: GREY,
  },

  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EDEEF2',
    paddingTop: 14,
  },

  totalLabel: {
    fontSize: 16,
    color: BLACK,
    fontWeight: '600',
  },

  totalValue: {
    fontSize: 17,
    color: BLACK,
    fontWeight: '600',
  },

  itemsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginBottom: 20,
  },

  itemsLinkTitle: {
    fontSize: 15,
    color: BLACK,
    fontWeight: '600',
  },

  arrow: {
    fontSize: 28,
    color: BLACK,
  },

  reviewCard: {
    padding: 14,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    marginBottom: 18,
  },

  reviewLabel: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '600',
    marginBottom: 8,
  },

  reviewValue: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '600',
    marginBottom: 3,
  },

  reviewText: {
    fontSize: 13,
    color: GREY,
    lineHeight: 20,
  },

  itemsContent: {
    padding: 16,
    paddingBottom: 30,
  },

  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },

  itemImageBox: {
    width: 120,
    height: 120,
    borderRadius: 12,
    backgroundColor: '#EFF3F4',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },

  itemImage: {
    width: '100%',
    height: '100%',
  },

  itemInfo: {
    flex: 1,
    marginLeft: 10,
  },

  itemName: {
    fontSize: 13,
    color: BLACK,
    lineHeight: 18,
  },

  itemPrice: {
    fontSize: 14,
    color: BLACK,
    fontWeight: '600',
    marginTop: 8,
  },

  qty: {
    fontSize: 12,
    color: GREY,
    marginTop: 8,
  },

  success: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  successBox: {
    width: '100%',
    height: 300,
    borderRadius: 28,
    backgroundColor: '#F2FBF9',
    alignItems: 'center',
    justifyContent: 'center',
  },

  successMark: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GREEN,
    color: '#FFFFFF',
    fontSize: 66,
    fontWeight: '700',
    textAlign: 'center',
    textAlignVertical: 'center',
    overflow: 'hidden',
  },

  successTitle: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
    color: BLACK,
    textAlign: 'center',
    marginTop: 26,
  },

  successText: {
    fontSize: 13,
    lineHeight: 21,
    color: GREY,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 8,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

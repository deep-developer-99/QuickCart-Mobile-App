import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethod'>;
type BackendPaymentMethod = 'COD' | 'RAZORPAY_FAKE';

const BORDER = '#ECEEF4';
const BLACK = '#17171A';
const GREY = '#A5A7AE';
const Field = ({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'number-pad';
  secureTextEntry?: boolean;
}) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.label}>
      {label}
      <Text style={styles.required}> *</Text>
    </Text>
    <TextInput
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#C5C7CD"
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      secureTextEntry={secureTextEntry}
      style={styles.input}
    />
  </View>
);
export default function PaymentMethodScreen({ navigation }: Props) {
  const [method, setMethod] = useState<BackendPaymentMethod>('RAZORPAY_FAKE');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handleSave = () => {
    if (method === 'COD') {
      Alert.alert(
        'Payment Method',
        'Cash on Delivery is supported by the current QuickCart backend.',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
      return;
    }

    if (
      !cardHolder.trim() ||
      !cardNumber.trim() ||
      !expiry.trim() ||
      !cvv.trim()
    ) {
      Alert.alert('Missing information', 'Please fill all card fields.');
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, '');

    if (!/^\d{12,19}$/.test(cleanCardNumber)) {
      Alert.alert('Invalid card number', 'Please enter a valid card number.');
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      Alert.alert('Invalid expiry', 'Use MM/YY format.');
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      Alert.alert('Invalid CVV', 'Please enter a valid CVV.');
      return;
    }

    /*
     * The current QuickCart backend does not have a saved-card/payment-method
     * collection or endpoint. Orders currently accept COD or RAZORPAY_FAKE.
     * Therefore card details are validated for the Figma flow only and are
     * never sent to or stored by QuickCart.
     */
    Alert.alert(
      'Payment Method',
      'Card / UPI is represented by the backend payment option RAZORPAY_FAKE. Card details are not stored because the current backend has no saved-payment API.',
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={10}
        >
          <Text style={styles.backArrow}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Payment Method</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <View style={styles.methodRow}>
            <Pressable
              style={[
                styles.methodCard,
                method === 'RAZORPAY_FAKE' && styles.methodCardSelected,
              ]}
              onPress={() => setMethod('RAZORPAY_FAKE')}
            >
              <Text style={styles.paypal}>PayPal</Text>
            </Pressable>

            <Pressable
              style={[
                styles.methodCard,
                method === 'RAZORPAY_FAKE' && styles.methodCardSelected,
              ]}
              onPress={() => setMethod('RAZORPAY_FAKE')}
            >
              <Text style={styles.gpay}>
                <Text style={styles.g}>G</Text>Pay
              </Text>
            </Pressable>
          </View>

          <Pressable style={styles.codRow} onPress={() => setMethod('COD')}>
            <View
              style={[styles.radio, method === 'COD' && styles.radioSelected]}
            >
              {method === 'COD' ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={styles.codTextWrap}>
              <Text style={styles.codTitle}>Cash on Delivery</Text>
              <Text style={styles.codSubtitle}>
                Supported directly by the current backend
              </Text>
            </View>
          </Pressable>

          {method === 'RAZORPAY_FAKE' ? (
            <>
              <Field
                label="Card Holder Name"
                value={cardHolder}
                placeholder="Enter card holder name"
                onChangeText={setCardHolder}
                styles={styles}
              />

              <Field
                label="Card Number"
                value={cardNumber}
                placeholder="4111 1111 1111 1111"
                keyboardType="number-pad"
                onChangeText={value =>
                  setCardNumber(
                    value
                      .replace(/\D/g, '')
                      .slice(0, 19)
                      .replace(/(.{4})/g, '$1 ')
                      .trim(),
                  )
                }
                styles={styles}
              />

              <View style={styles.splitRow}>
                <View style={styles.half}>
                  <Field
                    label="Expiration"
                    value={expiry}
                    placeholder="MM/YY"
                    keyboardType="number-pad"
                    onChangeText={value => {
                      const digits = value.replace(/\D/g, '').slice(0, 4);
                      setExpiry(
                        digits.length > 2
                          ? `${digits.slice(0, 2)}/${digits.slice(2)}`
                          : digits,
                      );
                    }}
                    styles={styles}
                  />
                </View>
                <View style={styles.half}>
                  <Field
                    label="CVV"
                    value={cvv}
                    placeholder="123"
                    keyboardType="number-pad"
                    secureTextEntry
                    onChangeText={value =>
                      setCvv(value.replace(/\D/g, '').slice(0, 4))
                    }
                    styles={styles}
                  />
                </View>
              </View>
            </>
          ) : null}

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>Save</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F1F5',
  },
  backButton: {
    width: 28,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  backArrow: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 38,
    lineHeight: 38,
    color: BLACK,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: BLACK,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  methodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  methodCard: {
    flex: 1,
    height: 65,
    borderRadius: 11,
    backgroundColor: '#F1FAF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodCardSelected: {
    borderWidth: 1,
    borderColor: '#DDEEEA',
  },
  paypal: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 19,
    fontStyle: 'italic',
    color: '#08739B',
  },
  gpay: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 20,
    color: '#5F6368',
  },
  g: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#4285F4',
  },
  codRow: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#A8ABB3',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioSelected: { borderColor: BLACK },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: BLACK,
  },
  codTextWrap: { flex: 1 },
  codTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: BLACK,
  },
  codSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    color: GREY,
    marginTop: 2,
  },
  fieldBlock: { marginBottom: 14 },
  label: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: BLACK,
    marginBottom: 9,
  },
  required: { color: '#E63E3E' },
  input: {
    height: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    paddingHorizontal: 15,
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: BLACK,
  },
  splitRow: {
    flexDirection: 'row',
    gap: 8,
  },
  half: { flex: 1 },
  saveButton: {
    height: 59,
    borderRadius: 11,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 164,
  },
  saveText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
});

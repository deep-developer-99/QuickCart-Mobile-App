import { AppText as Text, AppTextInput as TextInput } from '../../components/AppText';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import BackButton from '../../components/common/BackButton';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'PaymentMethod'>;
type BackendPaymentMethod = 'RAZORPAY_FAKE';

const BORDER = '#ECEEF4';
const BLACK = '#17171A';
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
  const { t } = useTranslation();
  const [method, setMethod] = useState<BackendPaymentMethod>('RAZORPAY_FAKE');
  const [cardHolder, setCardHolder] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');

  const handleSave = () => {
    if (
      !cardHolder.trim() ||
      !cardNumber.trim() ||
      !expiry.trim() ||
      !cvv.trim()
    ) {
      Alert.alert(t('ui.payment.missingInformation'), t('ui.payment.fillCardFields'));
      return;
    }

    const cleanCardNumber = cardNumber.replace(/\s/g, '');

    if (!/^\d{12,19}$/.test(cleanCardNumber)) {
      Alert.alert(t('ui.payment.invalidCardNumber'), t('ui.payment.validCardNumber'));
      return;
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      Alert.alert(t('ui.payment.invalidExpiry'), t('ui.payment.expiryFormat'));
      return;
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      Alert.alert(t('ui.payment.invalidCvv'), t('ui.payment.validCvv'));
      return;
    }

    /*
     * The current QuickCart backend does not have a saved-card/payment-method
     * collection or endpoint. Orders currently accept COD or RAZORPAY_FAKE.
     * Therefore card details are validated for the Figma flow only and are
     * never sent to or stored by QuickCart.
     */
    Alert.alert(
      t('ui.payment.infoTitle'),
      t('ui.payment.demoNotice'),
      [{ text: t('ui.payment.ok'), onPress: () => navigation.goBack() }],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <BackButton
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={10}
        />
        <Text style={styles.headerTitle}>{t('ui.payment.title')}</Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
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

          {method === 'RAZORPAY_FAKE' ? (
            <>
              <Field
                label={t('ui.payment.cardHolderName')}
                value={cardHolder}
                placeholder={t('ui.payment.enterCardHolder')}
                onChangeText={setCardHolder}
              />

              <Field
                label={t('ui.payment.cardNumber')}
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
              />

              <View style={styles.splitRow}>
                <View style={styles.half}>
                  <Field
                    label={t('ui.payment.expiration')}
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
                  />
                </View>
                <View style={styles.half}>
                  <Field
                    label={t('ui.payment.cvv')}
                    value={cvv}
                    placeholder="123"
                    keyboardType="number-pad"
                    secureTextEntry
                    onChangeText={value =>
                      setCvv(value.replace(/\D/g, '').slice(0, 4))
                    }
                  />
                </View>
              </View>
            </>
          ) : null}

          <Pressable style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveText}>{t('ui.payment.save')}</Text>
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

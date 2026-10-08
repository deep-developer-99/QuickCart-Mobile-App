import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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

import {
  type Address,
  type CreateAddressData,
  useCreateAddressMutation,
  useGetAddressesQuery,
} from '../../api/addressApi';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ShippingAddress'>;

const BORDER = '#ECEEF4';
const BLACK = '#17171A';
const GREY = '#9A9DA8';

const emptyForm: CreateAddressData = {
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  isDefault: false,
};

const Field = ({
  label,
  value,
  placeholder,
  keyboardType,
  required = true,
  onChangeText,
}: {
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  required?: boolean;
  onChangeText: (value: string) => void;
}) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.label}>
      {label}
      {required ? <Text style={styles.required}> *</Text> : null}
    </Text>
    <TextInput
      value={value}
      placeholder={placeholder}
      placeholderTextColor="#C5C7CD"
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      style={styles.input}
      autoCapitalize={label === 'Full Name' ? 'words' : 'none'}
    />
  </View>
);

export default function ShippingAddressScreen({ navigation }: Props) {
  const { data, isLoading, isFetching, refetch } = useGetAddressesQuery();
  const [createAddress, { isLoading: saving }] = useCreateAddressMutation();

  const addresses: Address[] = useMemo(() => data?.data ?? [], [data?.data]);
  const [form, setForm] = useState<CreateAddressData>(emptyForm);
  const [loadedAddressId, setLoadedAddressId] = useState<string | null>(null);

  useEffect(() => {
    const defaultAddress =
      addresses.find(item => item.isDefault) ?? addresses[0];

    if (defaultAddress) {
      setLoadedAddressId(defaultAddress._id);
      setForm({
        fullName: defaultAddress.fullName ?? '',
        phone: defaultAddress.phone ?? '',
        addressLine: defaultAddress.addressLine ?? '',
        city: defaultAddress.city ?? '',
        state: defaultAddress.state ?? '',
        pincode: defaultAddress.pincode ?? '',
        latitude: defaultAddress.latitude,
        longitude: defaultAddress.longitude,
        isDefault: Boolean(defaultAddress.isDefault),
      });
    }
  }, [addresses]);

  const updateField = (field: keyof CreateAddressData, value: string) => {
    setForm(previous => ({ ...previous, [field]: value }));
  };

  const handleSave = async () => {
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
      Alert.alert(
        'Invalid postal code',
        'Please enter a valid 6-digit postal code.',
      );
      return;
    }

    /*
     * The current mobile/backend address API exposes GET/CREATE in the
     * mobile API used by Checkout. There is no update mutation in the
     * current mobile addressApi, so an existing address is not silently
     * overwritten. New addresses are saved through the real backend API.
     */
    if (loadedAddressId) {
      Alert.alert(
        'Address already saved',
        'Your saved address is already connected to QuickCart. The current mobile API does not expose address update yet.',
        [{ text: 'OK' }],
      );
      return;
    }

    try {
      await createAddress({
        ...form,
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        isDefault: addresses.length === 0,
      }).unwrap();

      await refetch();

      Alert.alert('Success', 'Shipping address saved successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert(
        'Unable to save',
        error?.data?.message || 'Failed to save shipping address.',
      );
    }
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
        <Text style={styles.headerTitle}>Shipping Address</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={BLACK} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <Field
              label="Full Name"
              value={form.fullName}
              placeholder="Enter full name"
              onChangeText={value => updateField('fullName', value)}
              styles={styles}
            />

            <Field
              label="Phone Number"
              value={form.phone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              onChangeText={value => updateField('phone', value)}
              styles={styles}
            />

            <Field
              label="Street Address"
              value={form.addressLine}
              placeholder="Enter street address"
              onChangeText={value => updateField('addressLine', value)}
              styles={styles}
            />

            <View style={styles.selectField}>
              <Text style={styles.selectText}>
                {form.state || 'Select Province'}
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </View>

            <View style={styles.selectField}>
              <Text style={styles.selectText}>
                {form.city || 'Select City'}
              </Text>
              <Text style={styles.chevron}>⌄</Text>
            </View>

            <Field
              label="Postal Code"
              value={form.pincode}
              placeholder="Enter postal code"
              keyboardType="number-pad"
              onChangeText={value => updateField('pincode', value)}
              styles={styles}
            />

            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || isFetching}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
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
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 15,
    color: BLACK,
  },
  headerSpacer: { width: 28 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
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
    backgroundColor: '#FFFFFF',
  },
  selectField: {
    height: 58,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 11,
    paddingHorizontal: 15,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    color: GREY,
  },
  chevron: {
    fontSize: 24,
    color: BLACK,
    marginTop: -8,
  },
  saveButton: {
    height: 59,
    borderRadius: 11,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  saveButtonDisabled: { opacity: 0.65 },
  saveText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: '#FFFFFF',
  },
  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

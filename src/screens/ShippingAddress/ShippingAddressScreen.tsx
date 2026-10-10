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
const GREY = '#8B8E99';
const GREEN = '#21D4B4';

const emptyForm: CreateAddressData = {
  fullName: '',
  phone: '',
  addressLine: '',
  city: '',
  state: '',
  pincode: '',
  latitude: undefined,
  longitude: undefined,
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

const SavedAddressCard = ({
  address,
  selected,
  onPress,
}: {
  address: Address;
  selected: boolean;
  onPress: () => void;
}) => (
  <Pressable
    onPress={onPress}
    style={[styles.addressCard, selected && styles.addressCardSelected]}
  >
    <View style={styles.addressCardTop}>
      <View style={styles.radio}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>

      <View style={styles.addressCardContent}>
        <View style={styles.nameRow}>
          <Text style={styles.addressName}>{address.fullName}</Text>
          {address.isDefault ? (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultBadgeText}>DEFAULT</Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.addressPhone}>{address.phone}</Text>

        <Text style={styles.addressLine}>
          {address.addressLine}, {address.city}
        </Text>

        <Text style={styles.addressLine}>
          {address.state} - {address.pincode}
        </Text>
      </View>
    </View>
  </Pressable>
);

export default function ShippingAddressScreen({ navigation }: Props) {
  const { data, isLoading, isFetching, refetch } = useGetAddressesQuery();
  const [createAddress, { isLoading: saving }] = useCreateAddressMutation();

  const addresses: Address[] = useMemo(() => data?.data ?? [], [data?.data]);
  const [form, setForm] = useState<CreateAddressData>(emptyForm);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const defaultAddress =
      addresses.find(address => address.isDefault) ?? addresses[0];

    setSelectedAddressId(defaultAddress?._id ?? null);
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

    const cleanPhone = form.phone.trim().replace(/\s+/g, '');
    if (!/^\+?[0-9]{10,15}$/.test(cleanPhone)) {
      Alert.alert('Invalid phone', 'Please enter a valid phone number.');
      return;
    }

    const cleanPincode = form.pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      Alert.alert(
        'Invalid postal code',
        'Please enter a valid 6-digit postal code.',
      );
      return;
    }

    try {
      const response = await createAddress({
        ...form,
        fullName: form.fullName.trim(),
        phone: cleanPhone,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: cleanPincode,
        isDefault: addresses.length === 0,
      }).unwrap();

      setForm(emptyForm);
      await refetch();

      if (response?.data?._id) {
        setSelectedAddressId(response.data._id);
      }

      Alert.alert('Success', 'New shipping address saved successfully.');
    } catch (error: any) {
      Alert.alert(
        'Unable to save',
        error?.data?.message ||
          error?.error ||
          'Failed to save shipping address.',
      );
    }
  };

  const handleSelectSavedAddress = (address: Address) => {
    setSelectedAddressId(address._id);
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
            <Text style={styles.sectionTitle}>Saved Addresses</Text>

            {addresses.length > 0 ? (
              <View style={styles.savedAddresses}>
                {addresses.map(address => (
                  <SavedAddressCard
                    key={address._id}
                    address={address}
                    selected={selectedAddressId === address._id}
                    onPress={() => handleSelectSavedAddress(address)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.emptySavedBox}>
                <Text style={styles.emptySavedTitle}>No saved address yet</Text>
                <Text style={styles.emptySavedText}>
                  Add your first delivery address below.
                </Text>
              </View>
            )}

            <View style={styles.formHeader}>
              <View>
                <Text style={styles.sectionTitle}>Add New Address</Text>
                <Text style={styles.formSubtitle}>
                  Fill in the details to save another address.
                </Text>
              </View>
            </View>

            <Field
              label="Full Name"
              value={form.fullName}
              placeholder="Enter full name"
              onChangeText={value => updateField('fullName', value)}
            />

            <Field
              label="Phone Number"
              value={form.phone}
              placeholder="Enter phone number"
              keyboardType="phone-pad"
              onChangeText={value => updateField('phone', value)}
            />

            <Field
              label="Street Address"
              value={form.addressLine}
              placeholder="Enter street address"
              onChangeText={value => updateField('addressLine', value)}
            />

            <Field
              label="State"
              value={form.state}
              placeholder="Enter state"
              onChangeText={value => updateField('state', value)}
            />

            <Field
              label="City"
              value={form.city}
              placeholder="Enter city"
              onChangeText={value => updateField('city', value)}
            />

            <Field
              label="Postal Code"
              value={form.pincode}
              placeholder="Enter postal code"
              keyboardType="number-pad"
              onChangeText={value => updateField('pincode', value)}
            />

            <Pressable
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving || isFetching}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save Address</Text>
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
    paddingTop: 16,
    paddingBottom: 36,
  },

  sectionTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
    color: BLACK,
    marginBottom: 10,
  },

  savedAddresses: {
    gap: 10,
    marginBottom: 24,
  },

  addressCard: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#FFFFFF',
  },

  addressCardSelected: {
    borderColor: GREEN,
    backgroundColor: '#F8FFFD',
  },

  addressCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#BFC2CA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },

  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GREEN,
  },

  addressCardContent: {
    flex: 1,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 5,
  },

  addressName: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
    color: BLACK,
    marginRight: 8,
  },

  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
    backgroundColor: '#E7FBF6',
  },

  defaultBadgeText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 8,
    color: '#159E86',
  },

  addressPhone: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: GREY,
    marginBottom: 5,
  },

  addressLine: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    lineHeight: 18,
    color: '#5F626D',
  },

  emptySavedBox: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    backgroundColor: '#FAFAFB',
  },

  emptySavedTitle: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 13,
    color: BLACK,
    marginBottom: 4,
  },

  emptySavedText: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: GREY,
  },

  formHeader: {
    marginBottom: 10,
  },

  formSubtitle: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 11,
    color: GREY,
    marginTop: -4,
    marginBottom: 12,
  },

  fieldBlock: {
    marginBottom: 14,
  },

  label: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: BLACK,
    marginBottom: 9,
  },

  required: {
    color: '#E63E3E',
  },

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

  saveButton: {
    height: 59,
    borderRadius: 11,
    backgroundColor: '#1C1C1C',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

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

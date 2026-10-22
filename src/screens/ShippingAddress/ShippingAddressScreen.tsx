import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { useTranslation } from 'react-i18next';

import {
  type Address,
  type CreateAddressData,
  useCreateAddressMutation,
  useGetAddressesQuery,
} from '../../api/addressApi';
import OpenStreetMapPicker from '../../components/OpenStreetMapPicker';
import {
  getCurrentLocation,
  requestLocationPermission,
  reverseGeocodeAddress,
  type LocationCoordinates,
} from '../../services/locationService';
import { typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import type { RootStackParamList } from '../../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ShippingAddress'>;
type Styles = ReturnType<typeof createStyles>;
type LocationStatus = 'idle' | 'loading' | 'ready' | 'error';

const COUNTRY_CODES = [
  { code: '+91', country: 'India' },
  { code: '+1', country: 'United States' },
  { code: '+44', country: 'United Kingdom' },
  { code: '+61', country: 'Australia' },
  { code: '+81', country: 'Japan' },
  { code: '+971', country: 'United Arab Emirates' },
] as const;

const emptyForm: CreateAddressData = {
  fullName: '', phone: '', addressLine: '', city: '', state: '', pincode: '',
  latitude: undefined, longitude: undefined, isDefault: false,
};

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.border },
  backButton: { width: 28, height: 40, alignItems: 'flex-start', justifyContent: 'center' },
  backArrow: { fontFamily: 'PlusJakartaSans-Regular', fontSize: 38, lineHeight: 38, color: colors.text, fontWeight: '300' },
  headerTitle: { flex: 1, fontFamily: 'PlusJakartaSans-Medium', fontSize: 15, color: colors.text },
  headerSpacer: { width: 28 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },
  sectionTitle: { fontFamily: 'PlusJakartaSans-Medium', fontSize: 16, color: colors.text, marginBottom: 10 },
  savedAddresses: { gap: 10, marginBottom: 24 },
  addressCard: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, backgroundColor: colors.surface },
  addressCardSelected: { borderColor: colors.cyan, backgroundColor: colors.cyan50 },
  addressCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.grey100, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 2 },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.cyan },
  addressCardContent: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', marginBottom: 5 },
  addressName: { ...typography.body2Medium, color: colors.text, marginRight: 8 },
  defaultBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5, backgroundColor: colors.cyan50 },
  defaultBadgeText: { ...typography.captionSemiBold, color: colors.cyan },
  addressPhone: { ...typography.captionRegular, color: colors.secondaryText, marginBottom: 5 },
  addressLine: { ...typography.captionRegular, lineHeight: 18, color: colors.secondaryText },
  emptySavedBox: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 24, backgroundColor: colors.surface },
  emptySavedTitle: { ...typography.captionSemiBold, color: colors.text, marginBottom: 4 },
  emptySavedText: { ...typography.captionRegular, color: colors.secondaryText },
  addCard: { borderRadius: 14, padding: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  formSubtitle: { ...typography.captionRegular, color: colors.secondaryText, marginTop: -4, marginBottom: 14 },
  addButton: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyan },
  addButtonText: { ...typography.body2Medium, color: colors.control },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalCard: { maxHeight: '92%', borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background, overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { flex: 1, ...typography.heading3SemiBold, color: colors.text },
  closeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  closeText: { fontSize: 22, color: colors.text },
  modalContent: { padding: 18, paddingBottom: 30 },
  mapFrame: { height: 280, marginBottom: 14, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface },
  mapPlaceholder: { minHeight: 120, borderRadius: 14, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: colors.surface },
  mapPlaceholderText: { ...typography.captionRegular, textAlign: 'center', color: colors.secondaryText },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
  statusText: { flex: 1, ...typography.captionRegular, color: colors.secondaryText },
  retryButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: colors.cyan50 },
  retryText: { ...typography.captionSemiBold, color: colors.cyan },
  fieldBlock: { marginBottom: 13 },
  label: { ...typography.captionRegular, color: colors.text, marginBottom: 6 },
  required: { color: colors.red },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.surface, fontFamily: 'PlusJakartaSans-Regular', fontSize: 13 },
  phoneRow: { flexDirection: 'row', gap: 8 },
  countryPickerWrapper: { position: 'relative', zIndex: 5 },
  countryButton: { minHeight: 46, minWidth: 70, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countryCode: { ...typography.captionRegular, color: colors.text },
  countryChevron: { color: colors.secondaryText, fontSize: 13 },
  countryDropdown: { position: 'absolute', top: 50, left: 0, width: 220, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, zIndex: 10, elevation: 5 },
  countryOption: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 10, gap: 10 },
  countryOptionCode: { width: 42, ...typography.captionSemiBold, color: colors.text },
  countryOptionName: { ...typography.captionRegular, color: colors.secondaryText },
  phoneInput: { flex: 1, minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 13, color: colors.text, backgroundColor: colors.surface, fontFamily: 'PlusJakartaSans-Regular', fontSize: 13 },
  saveButton: { height: 50, marginTop: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyan },
  saveButtonDisabled: { opacity: 0.55 },
  saveText: { ...typography.body2Medium, color: colors.control },
});

const Field = ({ styles, label, value, placeholder, keyboardType, onChangeText }: { styles: Styles; label: string; value: string; placeholder: string; keyboardType?: 'default' | 'phone-pad' | 'number-pad'; onChangeText: (value: string) => void }) => (
  <View style={styles.fieldBlock}>
    <Text style={styles.label}>{label} <Text style={styles.required}>*</Text></Text>
    <TextInput value={value} placeholder={placeholder} placeholderTextColor="#9FA3AD" onChangeText={onChangeText} keyboardType={keyboardType} style={styles.input} autoCapitalize={label.toLowerCase().includes('name') ? 'words' : 'none'} />
  </View>
);

const SavedAddressCard = ({ styles, address, selected, onPress }: { styles: Styles; address: Address; selected: boolean; onPress: () => void }) => (
  <Pressable onPress={onPress} style={[styles.addressCard, selected && styles.addressCardSelected]}>
    <View style={styles.addressCardTop}>
      <View style={styles.radio}>{selected ? <View style={styles.radioDot} /> : null}</View>
      <View style={styles.addressCardContent}>
        <View style={styles.nameRow}><Text style={styles.addressName}>{address.fullName}</Text>{address.isDefault ? <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>DEFAULT</Text></View> : null}</View>
        <Text style={styles.addressPhone}>{address.phone}</Text>
        <Text style={styles.addressLine}>{address.addressLine}, {address.city}</Text>
        <Text style={styles.addressLine}>{address.state} - {address.pincode}</Text>
      </View>
    </View>
  </Pressable>
);

export default function ShippingAddressScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { colors } = theme;
  const styles = createStyles(colors);
  const { data, isLoading, isFetching, refetch } = useGetAddressesQuery();
  const [createAddress, { isLoading: saving }] = useCreateAddressMutation();
  const addresses: Address[] = useMemo(() => data?.data ?? [], [data?.data]);
  const [form, setForm] = useState<CreateAddressData>(emptyForm);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [countryCode, setCountryCode] = useState('+91');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState('');
  const touchedFields = useRef(new Set<keyof CreateAddressData>());
  const reverseGeocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reverseRequestId = useRef(0);

  useEffect(() => {
    const defaultAddress = addresses.find(address => address.isDefault) ?? addresses[0];
    setSelectedAddressId(defaultAddress?._id ?? null);
  }, [addresses]);

  useEffect(() => () => { if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current); }, []);

  const updateField = useCallback((field: keyof CreateAddressData, value: string) => {
    touchedFields.current.add(field);
    setForm(previous => ({ ...previous, [field]: value }));
  }, []);

  const applyReverseGeocode = useCallback(async (nextCoordinates: LocationCoordinates) => {
    const requestId = ++reverseRequestId.current;
    setLocationStatus('loading');
    try {
      const address = await reverseGeocodeAddress(nextCoordinates.latitude, nextCoordinates.longitude);
      if (requestId !== reverseRequestId.current) return;
      setForm(previous => ({ ...previous, latitude: nextCoordinates.latitude, longitude: nextCoordinates.longitude, addressLine: touchedFields.current.has('addressLine') ? previous.addressLine : address?.addressLine || previous.addressLine, city: touchedFields.current.has('city') ? previous.city : address?.city || previous.city, state: touchedFields.current.has('state') ? previous.state : address?.state || previous.state, pincode: touchedFields.current.has('pincode') ? previous.pincode : address?.pincode || previous.pincode }));
      setLocationStatus(address ? 'ready' : 'error');
      setLocationError(address ? '' : t('shipping.locationAddressUnavailable'));
    } catch {
      if (requestId !== reverseRequestId.current) return;
      setLocationStatus('error');
      setLocationError(t('shipping.locationAddressUnavailable'));
      setForm(previous => ({ ...previous, latitude: nextCoordinates.latitude, longitude: nextCoordinates.longitude }));
    }
  }, [t]);

  const handleCoordinatesChange = useCallback((nextCoordinates: LocationCoordinates) => {
    setCoordinates(nextCoordinates);
    if (reverseGeocodeTimer.current) clearTimeout(reverseGeocodeTimer.current);
    reverseGeocodeTimer.current = setTimeout(() => { applyReverseGeocode(nextCoordinates); }, 500);
  }, [applyReverseGeocode]);

  const detectLocation = useCallback(async () => {
    setLocationStatus('loading');
    setLocationError('');
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) { setLocationStatus('error'); setLocationError(t('shipping.locationPermissionDenied')); return; }
      const nextCoordinates = await getCurrentLocation();
      setCoordinates(nextCoordinates);
      await applyReverseGeocode(nextCoordinates);
    } catch (error: any) {
      setLocationStatus('error');
      setLocationError(error?.code === 2 ? t('shipping.locationUnavailable') : t('shipping.locationRetry'));
    }
  }, [applyReverseGeocode, t]);

  const openAddressModal = () => {
    touchedFields.current.clear();
    setForm(emptyForm); setCountryCode('+91'); setCountryPickerOpen(false); setCoordinates(null); setLocationStatus('idle'); setLocationError(''); setModalOpen(true);
  };

  useEffect(() => { if (modalOpen) detectLocation(); }, [modalOpen, detectLocation]);

  const handleSave = async () => {
    const requiredFields: Array<keyof CreateAddressData> = ['fullName', 'phone', 'addressLine', 'city', 'state', 'pincode'];
    if (requiredFields.some(field => !String(form[field] ?? '').trim())) { Alert.alert(t('shipping.missingInformation'), t('shipping.fillRequired')); return; }
    const localPhone = form.phone.trim().replace(/\s+/g, '').replace(/^\+/, '');
    const cleanPhone = `${countryCode}${localPhone}`;
    if (!/^\+[0-9]{8,15}$/.test(cleanPhone)) { Alert.alert(t('shipping.invalidPhone'), t('shipping.invalidPhoneMessage')); return; }
    const cleanPincode = form.pincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) { Alert.alert(t('shipping.invalidPostalCode'), t('shipping.invalidPostalCodeMessage')); return; }
    try {
      const response = await createAddress({ ...form, fullName: form.fullName.trim(), phone: cleanPhone, addressLine: form.addressLine.trim(), city: form.city.trim(), state: form.state.trim(), pincode: cleanPincode, isDefault: addresses.length === 0 }).unwrap();
      setForm(emptyForm); setCountryCode('+91'); setCountryPickerOpen(false); setModalOpen(false); await refetch();
      if (response?.data?._id) setSelectedAddressId(response.data._id);
      Alert.alert(t('shipping.success'), t('shipping.savedSuccessfully'));
    } catch (error: any) { Alert.alert(t('shipping.saveFailed'), error?.data?.message || error?.error || t('shipping.saveFailedMessage')); }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}><Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={10}><Text style={styles.backArrow}>‹</Text></Pressable><Text style={styles.headerTitle}>{t('shipping.title')}</Text><View style={styles.headerSpacer} /></View>
      {isLoading ? <View style={styles.loader}><ActivityIndicator size="small" color={colors.cyan} /></View> : <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{t('shipping.savedAddresses')}</Text>
        {addresses.length > 0 ? <View style={styles.savedAddresses}>{addresses.map(address => <SavedAddressCard key={address._id} styles={styles} address={address} selected={selectedAddressId === address._id} onPress={() => setSelectedAddressId(address._id)} />)}</View> : <View style={styles.emptySavedBox}><Text style={styles.emptySavedTitle}>{t('shipping.noSavedAddress')}</Text><Text style={styles.emptySavedText}>{t('shipping.addFirstAddress')}</Text></View>}
        <View style={styles.addCard}><Text style={styles.sectionTitle}>{t('shipping.addNewAddress')}</Text><Text style={styles.formSubtitle}>{t('shipping.formSubtitle')}</Text><Pressable style={styles.addButton} onPress={openAddressModal} accessibilityRole="button"><Text style={styles.addButtonText}>{t('shipping.openAddressForm')}</Text></Pressable></View>
      </ScrollView>}

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}><KeyboardAvoidingView style={styles.modalCard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalHeader}><Text style={styles.modalTitle}>{t('shipping.addNewAddress')}</Text><Pressable style={styles.closeButton} onPress={() => setModalOpen(false)} accessibilityLabel={t('shipping.close')}><Text style={styles.closeText}>×</Text></Pressable></View>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalContent}>
            {coordinates ? <View style={styles.mapFrame}><OpenStreetMapPicker coordinates={coordinates} onCoordinatesChange={handleCoordinatesChange} onRequestCurrentLocation={detectLocation} currentLocationLoading={locationStatus === 'loading'} currentLocationLabel="📍 Use Current Location" /></View> : <View style={styles.mapPlaceholder}><Text style={styles.mapPlaceholderText}>{locationStatus === 'loading' ? t('shipping.detectingLocation') : t('shipping.mapUnavailable')}</Text></View>}
            <View style={styles.statusRow}>{locationStatus === 'loading' ? <ActivityIndicator size="small" color={colors.cyan} /> : null}<Text style={styles.statusText}>{locationStatus === 'ready' ? t('shipping.locationReady') : locationError}</Text>{locationStatus === 'error' ? <Pressable style={styles.retryButton} onPress={detectLocation}><Text style={styles.retryText}>{t('common.tryAgain')}</Text></Pressable> : null}</View>
            <Field styles={styles} label={t('shipping.fullName')} value={form.fullName} placeholder={t('shipping.fullNamePlaceholder')} onChangeText={value => updateField('fullName', value)} />
            <View style={styles.fieldBlock}><Text style={styles.label}>{t('shipping.phone')} <Text style={styles.required}>*</Text></Text><View style={styles.phoneRow}><View style={styles.countryPickerWrapper}><Pressable style={styles.countryButton} onPress={() => setCountryPickerOpen(value => !value)}><Text style={styles.countryCode}>{countryCode}</Text><Text style={styles.countryChevron}>⌄</Text></Pressable>{countryPickerOpen ? <View style={styles.countryDropdown}>{COUNTRY_CODES.map(option => <Pressable key={option.code} style={styles.countryOption} onPress={() => { setCountryCode(option.code); setCountryPickerOpen(false); }}><Text style={styles.countryOptionCode}>{option.code}</Text><Text style={styles.countryOptionName}>{option.country}</Text></Pressable>)}</View> : null}</View><TextInput value={form.phone} placeholder={t('shipping.phonePlaceholder')} placeholderTextColor="#9FA3AD" onChangeText={value => updateField('phone', value)} keyboardType="phone-pad" style={styles.phoneInput} /></View></View>
            <Field styles={styles} label={t('shipping.streetAddress')} value={form.addressLine} placeholder={t('shipping.streetAddressPlaceholder')} onChangeText={value => updateField('addressLine', value)} />
            <Field styles={styles} label={t('shipping.state')} value={form.state} placeholder={t('shipping.statePlaceholder')} onChangeText={value => updateField('state', value)} />
            <Field styles={styles} label={t('shipping.city')} value={form.city} placeholder={t('shipping.cityPlaceholder')} onChangeText={value => updateField('city', value)} />
            <Field styles={styles} label={t('shipping.postalCode')} value={form.pincode} placeholder={t('shipping.postalCodePlaceholder')} keyboardType="number-pad" onChangeText={value => updateField('pincode', value)} />
            <Pressable style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving || isFetching}>{saving ? <ActivityIndicator color={colors.control} /> : <Text style={styles.saveText}>{t('shipping.saveAddress')}</Text>}</Pressable>
          </ScrollView>
        </KeyboardAvoidingView></View>
      </Modal>
    </SafeAreaView>
  );
}

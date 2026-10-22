import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
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
import { useTranslation } from 'react-i18next';

import {
  type Address,
  type CreateAddressData,
  useCreateAddressMutation,
} from '../api/addressApi';
import OpenStreetMapPicker from './OpenStreetMapPicker';
import {
  getCurrentLocation,
  requestLocationPermission,
  resolveLocation,
  searchLocationSuggestions,
  type LocationSearchResult,
  type NearbyLandmark,
  type LocationCoordinates,
} from '../services/locationService';
import { typography, useTheme } from '../theme';
import type { ThemeColors } from '../theme';

type Props = {
  visible: boolean;
  hasExistingAddresses: boolean;
  onClose: () => void;
  onSaved: (address: Address) => void | Promise<void>;
};

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

const stylesFor = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    card: {
      maxHeight: '92%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      backgroundColor: colors.background,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 18,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: { flex: 1, ...typography.heading3SemiBold, color: colors.text },
    close: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    closeText: { fontSize: 22, color: colors.text },
    content: { padding: 18, paddingBottom: 30 },
    searchBlock: { marginBottom: 12, zIndex: 20, elevation: 8 },
    searchRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 12, backgroundColor: colors.surface },
    searchIcon: { fontSize: 20, color: colors.secondaryText, marginRight: 8 },
    searchInput: { flex: 1, minHeight: 46, paddingVertical: 0, color: colors.text, fontFamily: 'PlusJakartaSans-Regular', fontSize: 13 },
    searchClear: { padding: 5 },
    searchClearText: { color: colors.secondaryText, fontSize: 18 },
    suggestions: { marginTop: 6, borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, overflow: 'hidden' },
    suggestion: { paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
    suggestionLast: { borderBottomWidth: 0 },
    suggestionTitle: { ...typography.captionSemiBold, color: colors.text, marginBottom: 3 },
    suggestionAddress: { ...typography.captionRegular, color: colors.secondaryText },
    searchMessage: { padding: 12, ...typography.captionRegular, color: colors.secondaryText },
    nearbyBlock: { marginBottom: 14, padding: 12, borderRadius: 12, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    nearbyTitle: { ...typography.captionSemiBold, color: colors.text, marginBottom: 8 },
    nearestLandmark: { ...typography.captionRegular, color: colors.cyan, marginBottom: 8 },
    nearbyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
    nearbyItemLast: { borderBottomWidth: 0 },
    nearbyCopy: { flex: 1, marginRight: 8 },
    nearbyName: { ...typography.captionSemiBold, color: colors.text },
    nearbyMeta: { ...typography.captionRegular, color: colors.secondaryText, marginTop: 2 },
    nearbyDistance: { ...typography.captionRegular, color: colors.cyan },
    mapFrame: {
      height: 280,
      marginBottom: 14,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface,
    },
    mapPlaceholder: {
      minHeight: 120,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 18,
      backgroundColor: colors.surface,
    },
    muted: {
      ...typography.captionRegular,
      textAlign: 'center',
      color: colors.secondaryText,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 14,
      gap: 8,
    },
    status: {
      flex: 1,
      ...typography.captionRegular,
      color: colors.secondaryText,
    },
    retry: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.cyan50,
    },
    retryText: { ...typography.captionSemiBold, color: colors.cyan },
    fieldBlock: { marginBottom: 13 },
    label: {
      ...typography.captionRegular,
      color: colors.text,
      marginBottom: 6,
    },
    required: { color: colors.red },
    input: {
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      color: colors.text,
      backgroundColor: colors.surface,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 13,
    },
    phoneRow: { flexDirection: 'row', gap: 8 },
    countryWrapper: { position: 'relative', zIndex: 5 },
    countryButton: {
      minHeight: 46,
      minWidth: 70,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    countryCode: { ...typography.captionRegular, color: colors.text },
    chevron: { color: colors.secondaryText, fontSize: 13 },
    dropdown: {
      position: 'absolute',
      top: 50,
      left: 0,
      width: 220,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      zIndex: 10,
      elevation: 5,
    },
    option: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 10,
    },
    optionCode: {
      width: 42,
      ...typography.captionSemiBold,
      color: colors.text,
    },
    optionName: { ...typography.captionRegular, color: colors.secondaryText },
    phoneInput: {
      flex: 1,
      minHeight: 46,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 13,
      color: colors.text,
      backgroundColor: colors.surface,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 13,
    },
    save: {
      height: 50,
      marginTop: 6,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cyan,
    },
    disabled: { opacity: 0.55 },
    saveText: { ...typography.body2Medium, color: colors.control },
  });

export default function AddAddressModal({
  visible,
  hasExistingAddresses,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = stylesFor(theme.colors);
  const [createAddress, { isLoading: saving }] = useCreateAddressMutation();
  const [form, setForm] = useState<CreateAddressData>(emptyForm);
  const [countryCode, setCountryCode] = useState('+91');
  const [countryOpen, setCountryOpen] = useState(false);
  const [coordinates, setCoordinates] = useState<LocationCoordinates | null>(
    null,
  );
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('idle');
  const [locationError, setLocationError] = useState('');
  const touched = useRef(new Set<keyof CreateAddressData>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestId = useRef(0);
  const locationSession = useRef(0);
  const autoDetectionStarted = useRef(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);
  const mounted = useRef(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [nearbyLandmarks, setNearbyLandmarks] = useState<NearbyLandmark[]>([]);
  const [nearestLandmark, setNearestLandmark] = useState<NearbyLandmark | null>(null);
  const [landmarksLoading, setLandmarksLoading] = useState(false);
  const [landmarksError, setLandmarksError] = useState('');
  const [landmarksLoaded, setLandmarksLoaded] = useState(false);

  useEffect(
    () => () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    },
    [],
  );

  const updateField = useCallback(
    (field: keyof CreateAddressData, value: string) => {
      touched.current.add(field);
      setForm(previous => ({ ...previous, [field]: value }));
    },
    [],
  );

  const reverseGeocode = useCallback(
    async (
      next: LocationCoordinates,
      sessionId = locationSession.current,
    ) => {
      const currentRequest = ++requestId.current;
      setLocationStatus('loading');
      setLandmarksLoading(true);
      setLandmarksError('');
      try {
        const resolution = await resolveLocation(
          next.latitude,
          next.longitude,
        );
        if (
          !mounted.current ||
          sessionId !== locationSession.current ||
          currentRequest !== requestId.current
        )
          return;
        setForm(previous => ({
          ...previous,
          latitude: next.latitude,
          longitude: next.longitude,
          addressLine: touched.current.has('addressLine')
            ? previous.addressLine
            : resolution.address?.addressLine || previous.addressLine,
          city: touched.current.has('city')
            ? previous.city
            : resolution.address?.city || previous.city,
          state: touched.current.has('state')
            ? previous.state
            : resolution.address?.state || previous.state,
          pincode: touched.current.has('pincode')
            ? previous.pincode
            : resolution.address?.pincode || previous.pincode,
        }));
        setNearbyLandmarks(resolution.landmarks);
        setNearestLandmark(resolution.nearestLandmark);
        setLandmarksLoading(false);
        setLandmarksLoaded(true);
        setLandmarksError('');
        setLocationStatus(resolution.address ? 'ready' : 'error');
        setLocationError(
          resolution.address ? '' : t('shipping.locationAddressUnavailable'),
        );
      } catch {
      if (
        !mounted.current ||
        sessionId !== locationSession.current ||
        currentRequest !== requestId.current
      )
        return;
        setLocationStatus('error');
        setLocationError(t('shipping.locationAddressUnavailable'));
        setForm(previous => ({
          ...previous,
          latitude: next.latitude,
          longitude: next.longitude,
        }));
        setNearbyLandmarks([]);
        setNearestLandmark(null);
        setLandmarksLoading(false);
        setLandmarksLoaded(true);
        setLandmarksError('Nearby places are unavailable right now.');
      }
    },
    [t],
  );

  const onCoordinatesChange = useCallback(
    (next: LocationCoordinates) => {
      setCoordinates(next);
      const sessionId = locationSession.current;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        reverseGeocode(next, sessionId);
      }, 500);
    },
    [reverseGeocode],
  );

  const detectLocation = useCallback(
    async (sessionId = locationSession.current) => {
      setLocationStatus('loading');
      setLocationError('');
      try {
        if (!(await requestLocationPermission())) {
          if (sessionId !== locationSession.current) return;
          setLocationStatus('error');
          setLocationError(t('shipping.locationPermissionDenied'));
          return;
        }
        const next = await getCurrentLocation();
        if (!mounted.current || sessionId !== locationSession.current) return;
        setCoordinates(next);
        await reverseGeocode(next, sessionId);
      } catch (error: any) {
        if (!mounted.current || sessionId !== locationSession.current) return;
        setLocationStatus('error');
        setLocationError(
          error?.code === 2
            ? t('shipping.locationUnavailable')
            : t('shipping.locationRetry'),
        );
      }
    },
    [reverseGeocode, t],
  );

  useEffect(() => {
    if (!visible) {
      autoDetectionStarted.current = false;
      locationSession.current += 1;
      requestId.current += 1;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = null;
      searchRequestId.current += 1;
      return;
    }
    if (autoDetectionStarted.current) return;
    autoDetectionStarted.current = true;
    const sessionId = ++locationSession.current;
    touched.current.clear();
    setForm(emptyForm);
    setCountryCode('+91');
    setCountryOpen(false);
    setCoordinates(null);
    setLocationStatus('idle');
    setLocationError('');
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setSearching(false);
    setNearbyLandmarks([]);
    setNearestLandmark(null);
    setLandmarksError('');
    setLandmarksLoading(false);
    setLandmarksLoaded(false);
    detectLocation(sessionId);
  }, [visible, detectLocation]);

  const searchLocations = useCallback((value: string) => {
    setSearchQuery(value);
    setSearchError('');
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const query = value.trim();
    if (query.length < 3) {
      searchRequestId.current += 1;
      setSearchResults([]);
      setSearching(false);
      return;
    }
    const searchId = ++searchRequestId.current;
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const results = await searchLocationSuggestions(query);
        if (!mounted.current || searchId !== searchRequestId.current) return;
        setSearchResults(results);
      } catch {
        if (!mounted.current || searchId !== searchRequestId.current) return;
        setSearchResults([]);
        setSearchError(t('shipping.locationRetry'));
      } finally {
        if (mounted.current && searchId === searchRequestId.current) {
          setSearching(false);
        }
      }
    }, 450);
  }, [t]);

  const selectSearchResult = useCallback((result: LocationSearchResult) => {
    const next = { latitude: result.latitude, longitude: result.longitude };
    locationSession.current += 1;
    requestId.current += 1;
    if (timer.current) clearTimeout(timer.current);
    touched.current.delete('addressLine');
    touched.current.delete('city');
    touched.current.delete('state');
    touched.current.delete('pincode');
    setCoordinates(next);
    setForm(previous => ({
      ...previous,
      latitude: next.latitude,
      longitude: next.longitude,
      addressLine: result.addressLine || previous.addressLine,
      city: result.city || previous.city,
      state: result.state || previous.state,
      pincode: result.pincode || previous.pincode,
    }));
    setLocationStatus('ready');
    setLocationError('');
    setSearchQuery(result.displayAddress);
    setSearchResults([]);
    setSearchError('');
    Keyboard.dismiss();
  }, []);

  const selectLandmark = useCallback((landmark: NearbyLandmark) => {
    const next = { latitude: landmark.latitude, longitude: landmark.longitude };
    locationSession.current += 1;
    requestId.current += 1;
    if (timer.current) clearTimeout(timer.current);
    setCoordinates(next);
    setSearchResults([]);
    setSearchQuery(landmark.name);
    setNearbyLandmarks([]);
    setNearestLandmark(null);
    setLandmarksLoaded(false);
    setLandmarksError('');
    setLocationStatus('loading');
    setLocationError('');
    Keyboard.dismiss();
    reverseGeocode(next, locationSession.current);
  }, [reverseGeocode]);

  const save = async () => {
    const required: Array<keyof CreateAddressData> = [
      'fullName',
      'phone',
      'addressLine',
      'city',
      'state',
      'pincode',
    ];
    if (required.some(field => !String(form[field] ?? '').trim())) {
      Alert.alert(t('shipping.missingInformation'), t('shipping.fillRequired'));
      return;
    }
    const phone = `${countryCode}${form.phone
      .trim()
      .replace(/\s+/g, '')
      .replace(/^\+/, '')}`;
    if (!/^\+[0-9]{8,15}$/.test(phone)) {
      Alert.alert(
        t('shipping.invalidPhone'),
        t('shipping.invalidPhoneMessage'),
      );
      return;
    }
    if (!/^\d{6}$/.test(form.pincode.trim())) {
      Alert.alert(
        t('shipping.invalidPostalCode'),
        t('shipping.invalidPostalCodeMessage'),
      );
      return;
    }
    try {
      const response = await createAddress({
        ...form,
        fullName: form.fullName.trim(),
        phone,
        addressLine: form.addressLine.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        isDefault: !hasExistingAddresses,
      }).unwrap();
      await onSaved(response.data);
      onClose();
    } catch (error: any) {
      Alert.alert(
        t('shipping.saveFailed'),
        error?.data?.message || error?.error || t('shipping.saveFailedMessage'),
      );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <KeyboardAvoidingView
          style={styles.card}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t('shipping.addNewAddress')}</Text>
            <Pressable
              style={styles.close}
              onPress={onClose}
              accessibilityLabel={t('shipping.close')}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.searchBlock}>
              <View style={styles.searchRow}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  value={searchQuery}
                  onChangeText={searchLocations}
                  placeholder="Search for an area, street or address"
                  placeholderTextColor="#9FA3AD"
                  style={styles.searchInput}
                  returnKeyType="search"
                  autoCorrect={false}
                  accessibilityLabel="Search for an area, street or address"
                />
                {searching ? <ActivityIndicator size="small" color={theme.colors.cyan} /> : null}
                {!searching && searchQuery ? (
                  <Pressable
                    style={styles.searchClear}
                    onPress={() => searchLocations('')}
                    accessibilityLabel="Clear address search"
                  >
                    <Text style={styles.searchClearText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
              {searching || searchError || (searchQuery.trim().length >= 3 && !searchResults.length) ? (
                <View style={styles.suggestions}>
                  {searching ? <Text style={styles.searchMessage}>Searching…</Text> : null}
                  {!searching && searchError ? <Text style={styles.searchMessage}>{searchError}</Text> : null}
                  {!searching && !searchError && searchQuery.trim().length >= 3 && !searchResults.length ? <Text style={styles.searchMessage}>No matching locations found.</Text> : null}
                </View>
              ) : null}
              {!searching && searchResults.length ? (
                <View style={styles.suggestions}>
                  {searchResults.map((result, index) => (
                    <Pressable
                      key={`${result.latitude},${result.longitude},${index}`}
                      style={[styles.suggestion, index === searchResults.length - 1 && styles.suggestionLast]}
                      onPress={() => selectSearchResult(result)}
                    >
                      <Text style={styles.suggestionTitle}>{result.formattedAddress || result.displayAddress}</Text>
                      <Text style={styles.suggestionAddress} numberOfLines={2}>{result.displayAddress}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
    {coordinates && (landmarksLoading || landmarksError || landmarksLoaded || nearbyLandmarks.length > 0) ? (
              <View style={styles.nearbyBlock}>
                <Text style={styles.nearbyTitle}>Nearby places</Text>
                {nearestLandmark ? (
                  <Text style={styles.nearestLandmark}>
                    Closest suitable landmark: {nearestLandmark.name}
                  </Text>
                ) : null}
                {landmarksLoading ? <ActivityIndicator size="small" color={theme.colors.cyan} /> : null}
                {!landmarksLoading && landmarksError ? <Text style={styles.searchMessage}>{landmarksError}</Text> : null}
                {!landmarksLoading && !landmarksError && nearbyLandmarks.length === 0 ? <Text style={styles.searchMessage}>No named nearby places found.</Text> : null}
                {!landmarksLoading ? nearbyLandmarks.map((landmark, index) => (
                  <Pressable
                    key={`${landmark.name}-${landmark.latitude}-${landmark.longitude}`}
                    style={[styles.nearbyItem, index === nearbyLandmarks.length - 1 && styles.nearbyItemLast]}
                    onPress={() => selectLandmark(landmark)}
                  >
                    <View style={styles.nearbyCopy}>
                      <Text style={styles.nearbyName} numberOfLines={1}>{landmark.name}</Text>
                      <Text style={styles.nearbyMeta}>{landmark.category}</Text>
                    </View>
                    <Text style={styles.nearbyDistance}>{landmark.distanceMeters < 1000 ? `${Math.round(landmark.distanceMeters)} m` : `${(landmark.distanceMeters / 1000).toFixed(1)} km`}</Text>
                  </Pressable>
                )) : null}
              </View>
            ) : null}
            {coordinates ? (
              <View style={styles.mapFrame}>
                <OpenStreetMapPicker
                  coordinates={coordinates}
                  onCoordinatesChange={onCoordinatesChange}
                  onRequestCurrentLocation={() => {
                    detectLocation();
                  }}
                  currentLocationLoading={locationStatus === 'loading'}
                  currentLocationLabel="📍 Use Current Location"
                />
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.muted}>
                  {locationStatus === 'loading'
                    ? t('shipping.detectingLocation')
                    : t('shipping.mapUnavailable')}
                </Text>
              </View>
            )}
            <View style={styles.statusRow}>
              {locationStatus === 'loading' ? (
                <ActivityIndicator size="small" color={theme.colors.cyan} />
              ) : null}
              <Text style={styles.status}>
                {locationStatus === 'ready'
                  ? t('shipping.locationReady')
                  : locationError}
              </Text>
              {locationStatus === 'error' ? (
                <Pressable
                  style={styles.retry}
                  onPress={() => {
                    detectLocation();
                  }}
                >
                  <Text style={styles.retryText}>{t('common.tryAgain')}</Text>
                </Pressable>
              ) : null}
            </View>
            <Field
              styles={styles}
              label={t('shipping.fullName')}
              value={form.fullName}
              placeholder={t('shipping.fullNamePlaceholder')}
              onChangeText={value => updateField('fullName', value)}
            />
            <View style={styles.fieldBlock}>
              <Text style={styles.label}>
                {t('shipping.phone')} <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.phoneRow}>
                <View style={styles.countryWrapper}>
                  <Pressable
                    style={styles.countryButton}
                    onPress={() => setCountryOpen(value => !value)}
                  >
                    <Text style={styles.countryCode}>{countryCode}</Text>
                    <Text style={styles.chevron}>⌄</Text>
                  </Pressable>
                  {countryOpen ? (
                    <View style={styles.dropdown}>
                      {COUNTRY_CODES.map(option => (
                        <Pressable
                          key={option.code}
                          style={styles.option}
                          onPress={() => {
                            setCountryCode(option.code);
                            setCountryOpen(false);
                          }}
                        >
                          <Text style={styles.optionCode}>{option.code}</Text>
                          <Text style={styles.optionName}>
                            {option.country}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : null}
                </View>
                <TextInput
                  value={form.phone}
                  placeholder={t('shipping.phonePlaceholder')}
                  placeholderTextColor="#9FA3AD"
                  onChangeText={value => updateField('phone', value)}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />
              </View>
            </View>
            <Field
              styles={styles}
              label={t('shipping.streetAddress')}
              value={form.addressLine}
              placeholder={t('shipping.streetAddressPlaceholder')}
              onChangeText={value => updateField('addressLine', value)}
            />
            <Field
              styles={styles}
              label={t('shipping.state')}
              value={form.state}
              placeholder={t('shipping.statePlaceholder')}
              onChangeText={value => updateField('state', value)}
            />
            <Field
              styles={styles}
              label={t('shipping.city')}
              value={form.city}
              placeholder={t('shipping.cityPlaceholder')}
              onChangeText={value => updateField('city', value)}
            />
            <Field
              styles={styles}
              label={t('shipping.postalCode')}
              value={form.pincode}
              placeholder={t('shipping.postalCodePlaceholder')}
              keyboardType="number-pad"
              onChangeText={value => updateField('pincode', value)}
            />
            <Pressable
              style={[styles.save, saving && styles.disabled]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.control} />
              ) : (
                <Text style={styles.saveText}>{t('shipping.saveAddress')}</Text>
              )}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function Field({
  styles,
  label,
  value,
  placeholder,
  keyboardType,
  onChangeText,
}: {
  styles: ReturnType<typeof stylesFor>;
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  onChangeText: (value: string) => void;
}) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#9FA3AD"
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        autoCapitalize={label.toLowerCase().includes('name') ? 'words' : 'none'}
      />
    </View>
  );
}

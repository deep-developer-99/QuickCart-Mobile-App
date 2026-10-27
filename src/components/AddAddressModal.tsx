import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import type { ScrollViewInstance } from 'react-native';
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
type TextInputRef = React.ElementRef<typeof TextInput>;

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
    keyboardContainer: { flex: 1, justifyContent: 'flex-end' },
    card: {
      flex: 1,
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
    content: { flexGrow: 1, padding: 18, paddingBottom: 24 },
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
  const formScrollRef = useRef<ScrollViewInstance>(null);
  const scrollOffsetRef = useRef(0);
  const searchInputRef = useRef<TextInputRef>(null);
  const phoneInputRef = useRef<TextInputRef>(null);
  const formInputRefs = useRef<Array<TextInputRef | null>>([]);
  const focusedInputRef = useRef<TextInputRef | null>(null);
  const keyboardVisibleRef = useRef(false);
  const keyboardTopRef = useRef<number | null>(null);
  const pendingScrollFrameRef = useRef<number | null>(null);
  const [keyboardBottomPadding, setKeyboardBottomPadding] = useState(24);

  const scheduleFocusedInputScroll = useCallback(() => {
    if (!keyboardVisibleRef.current || !focusedInputRef.current) return;

    if (pendingScrollFrameRef.current !== null) {
      cancelAnimationFrame(pendingScrollFrameRef.current);
    }

    pendingScrollFrameRef.current = requestAnimationFrame(() => {
      pendingScrollFrameRef.current = requestAnimationFrame(() => {
        pendingScrollFrameRef.current = null;
        const input = focusedInputRef.current;
        const scrollView = formScrollRef.current;
        if (!input || !scrollView) return;

        input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
          scrollView.measureInWindow(
            (_scrollX, scrollY, _scrollWidth, scrollHeight) => {
              const visibleTop = scrollY + 12;
              const keyboardTop =
                keyboardTopRef.current ?? Dimensions.get('screen').height;
              const visibleBottom =
                Math.min(scrollY + scrollHeight, keyboardTop) - 24;
              const inputBottom = inputY + inputHeight;
              let targetOffset = scrollOffsetRef.current;
              if (inputY < visibleTop) {
                targetOffset -= visibleTop - inputY;
              } else if (inputBottom > visibleBottom) {
                targetOffset += inputBottom - visibleBottom;
              }

              if (targetOffset !== scrollOffsetRef.current) {
                scrollView.scrollTo({
                  y: Math.max(0, targetOffset),
                  animated: true,
                });
              }
            },
          );
        });
      });
    });
  }, []);

  const scrollInputIntoView = useCallback(
    (input: TextInputRef | null) => {
      focusedInputRef.current = input;
      scheduleFocusedInputScroll();
    },
    [scheduleFocusedInputScroll],
  );

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', event => {
      keyboardVisibleRef.current = true;
      keyboardTopRef.current = event.endCoordinates.screenY;
      requestAnimationFrame(() => {
        formScrollRef.current?.measureInWindow(
          (_x, scrollY, _width, scrollHeight) => {
            const obscuredHeight = Math.max(
              0,
              scrollY + scrollHeight - event.endCoordinates.screenY,
            );
            setKeyboardBottomPadding(obscuredHeight + 24);
          },
        );
      });
      scheduleFocusedInputScroll();
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      keyboardVisibleRef.current = false;
      keyboardTopRef.current = null;
      setKeyboardBottomPadding(24);
      if (pendingScrollFrameRef.current !== null) {
        cancelAnimationFrame(pendingScrollFrameRef.current);
        pendingScrollFrameRef.current = null;
      }
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [scheduleFocusedInputScroll]);
  useEffect(
    () => () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      if (pendingScrollFrameRef.current !== null) {
        cancelAnimationFrame(pendingScrollFrameRef.current);
      }
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
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
          onLayout={scheduleFocusedInputScroll}
        >
          <View style={styles.card}>
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
            ref={formScrollRef}
              onScroll={event => {
                scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            onLayout={scheduleFocusedInputScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: keyboardBottomPadding },
            ]}
          >
            <View style={styles.searchBlock}>
              <View style={styles.searchRow}>
                <Text style={styles.searchIcon}>⌕</Text>
                <TextInput
                  ref={searchInputRef}
                  value={searchQuery}
                  onChangeText={searchLocations}
                  placeholder={t('ui.addressSearch.placeholder')}
                  placeholderTextColor="#9FA3AD"
                  style={styles.searchInput}
                  returnKeyType="next"
                  autoCorrect={false}
                  onSubmitEditing={() => formInputRefs.current[0]?.focus()}
                  onFocus={() => scrollInputIntoView(searchInputRef.current)}
                  accessibilityLabel={t('ui.addressSearch.placeholder')}
                />
                {searching ? <ActivityIndicator size="small" color={theme.colors.cyan} /> : null}
                {!searching && searchQuery ? (
                  <Pressable
                    style={styles.searchClear}
                    onPress={() => searchLocations('')}
                    accessibilityLabel={t('ui.addressSearch.clear')}
                  >
                    <Text style={styles.searchClearText}>×</Text>
                  </Pressable>
                ) : null}
              </View>
              {searching || searchError || (searchQuery.trim().length >= 3 && !searchResults.length) ? (
                <View style={styles.suggestions}>
                  {searching ? <Text style={styles.searchMessage}>{t('ui.common.searching')}</Text> : null}
                  {!searching && searchError ? <Text style={styles.searchMessage}>{searchError}</Text> : null}
                  {!searching && !searchError && searchQuery.trim().length >= 3 && !searchResults.length ? <Text style={styles.searchMessage}>{t('ui.common.noLocations')}</Text> : null}
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
            {coordinates ? (
              <View style={styles.mapFrame}>
                <OpenStreetMapPicker
                  coordinates={coordinates}
                  onCoordinatesChange={onCoordinatesChange}
                  onRequestCurrentLocation={() => {
                    detectLocation();
                  }}
                  currentLocationLoading={locationStatus === 'loading'}
                  currentLocationLabel={t('ui.common.useCurrentLocation')}
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
              onInputRef={input => {
                formInputRefs.current[0] = input;
              }}
              returnKeyType="next"
              onSubmitEditing={() => phoneInputRef.current?.focus()}
              onFocus={scrollInputIntoView}
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
                  ref={phoneInputRef}
                  value={form.phone}
                  placeholder={t('shipping.phonePlaceholder')}
                  placeholderTextColor="#9FA3AD"
                  onChangeText={value => updateField('phone', value)}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                  returnKeyType="next"
                  onSubmitEditing={() => formInputRefs.current[1]?.focus()}
                  onFocus={() => scrollInputIntoView(phoneInputRef.current)}
                />
              </View>
            </View>
            <Field
              styles={styles}
              label={t('shipping.streetAddress')}
              value={form.addressLine}
              placeholder={t('shipping.streetAddressPlaceholder')}
              onChangeText={value => updateField('addressLine', value)}
              onInputRef={input => {
                formInputRefs.current[1] = input;
              }}
              returnKeyType="next"
              onSubmitEditing={() => formInputRefs.current[2]?.focus()}
              onFocus={scrollInputIntoView}
            />
            <Field
              styles={styles}
              label={t('shipping.state')}
              value={form.state}
              placeholder={t('shipping.statePlaceholder')}
              onChangeText={value => updateField('state', value)}
              onInputRef={input => {
                formInputRefs.current[2] = input;
              }}
              returnKeyType="next"
              onSubmitEditing={() => formInputRefs.current[3]?.focus()}
              onFocus={scrollInputIntoView}
            />
            <Field
              styles={styles}
              label={t('shipping.city')}
              value={form.city}
              placeholder={t('shipping.cityPlaceholder')}
              onChangeText={value => updateField('city', value)}
              onInputRef={input => {
                formInputRefs.current[3] = input;
              }}
              returnKeyType="next"
              onSubmitEditing={() => formInputRefs.current[4]?.focus()}
              onFocus={scrollInputIntoView}
            />
            <Field
              styles={styles}
              label={t('shipping.postalCode')}
              value={form.pincode}
              placeholder={t('shipping.postalCodePlaceholder')}
              keyboardType="number-pad"
              onChangeText={value => updateField('pincode', value)}
              onInputRef={input => {
                formInputRefs.current[4] = input;
              }}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
              onFocus={scrollInputIntoView}
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
          </View>
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
  onInputRef,
  returnKeyType,
  onSubmitEditing,
  onFocus,
}: {
  styles: ReturnType<typeof stylesFor>;
  label: string;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'phone-pad' | 'number-pad';
  onChangeText: (value: string) => void;
  onInputRef: (input: TextInputRef | null) => void;
  returnKeyType: 'next' | 'done';
  onSubmitEditing: () => void;
  onFocus: (input: TextInputRef | null) => void;
}) {
  const inputRef = useRef<TextInputRef>(null);

  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.label}>
        {label} <Text style={styles.required}>*</Text>
      </Text>
      <TextInput
        ref={input => {
          inputRef.current = input;
          onInputRef(input);
        }}
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#9FA3AD"
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        style={styles.input}
        autoCapitalize={label.toLowerCase().includes('name') ? 'words' : 'none'}
        onFocus={() => onFocus(inputRef.current)}
      />
    </View>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { type Address, useGetAddressesQuery } from '../../api/addressApi';
import AddAddressModal from '../../components/AddAddressModal';
import type { RootStackParamList } from '../../navigation/RootNavigator';
import { typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'ShippingAddress'>;

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      height: 56,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
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
      color: colors.text,
      fontWeight: '300',
    },
    headerTitle: {
      flex: 1,
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 15,
      color: colors.text,
    },
    headerSpacer: { width: 28 },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 36 },
    sectionTitle: {
      fontFamily: 'PlusJakartaSans-Medium',
      fontSize: 16,
      color: colors.text,
      marginBottom: 10,
    },
    savedAddresses: { gap: 10, marginBottom: 24 },
    addressCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      backgroundColor: colors.surface,
    },
    addressCardSelected: {
      borderColor: colors.cyan,
      backgroundColor: colors.cyan50,
    },
    addressCardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    radio: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: colors.grey100,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
      marginTop: 2,
    },
    radioDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.cyan,
    },
    addressCardContent: { flex: 1 },
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      marginBottom: 5,
    },
    addressName: {
      ...typography.body2Medium,
      color: colors.text,
      marginRight: 8,
    },
    defaultBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 5,
      backgroundColor: colors.cyan50,
    },
    defaultBadgeText: { ...typography.captionSemiBold, color: colors.cyan },
    addressPhone: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      marginBottom: 5,
    },
    addressLine: {
      ...typography.captionRegular,
      lineHeight: 18,
      color: colors.secondaryText,
    },
    emptySavedBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      backgroundColor: colors.surface,
    },
    emptySavedTitle: {
      ...typography.captionSemiBold,
      color: colors.text,
      marginBottom: 4,
    },
    emptySavedText: {
      ...typography.captionRegular,
      color: colors.secondaryText,
    },
    addCard: {
      borderRadius: 14,
      padding: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    formSubtitle: {
      ...typography.captionRegular,
      color: colors.secondaryText,
      marginTop: -4,
      marginBottom: 14,
    },
    addButton: {
      height: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cyan,
    },
    addButtonText: { ...typography.body2Medium, color: colors.control },
    loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  });

const SavedAddressCard = ({
  styles,
  address,
  selected,
  onPress,
}: {
  styles: ReturnType<typeof createStyles>;
  address: Address;
  selected: boolean;
  onPress: () => void;
}) => {
  const { t } = useTranslation();
  return (
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
              <Text style={styles.defaultBadgeText}>{t('shipping.default')}</Text>
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
};

export default function ShippingAddressScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);
  const { data, isLoading, refetch } = useGetAddressesQuery();
  const addresses: Address[] = useMemo(() => data?.data ?? [], [data?.data]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    null,
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const defaultAddress =
      addresses.find(address => address.isDefault) ?? addresses[0];
    setSelectedAddressId(defaultAddress?._id ?? null);
  }, [addresses]);

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
        <Text style={styles.headerTitle}>{t('shipping.title')}</Text>
        <View style={styles.headerSpacer} />
      </View>
      {isLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color={theme.colors.cyan} />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <Text style={styles.sectionTitle}>
            {t('shipping.savedAddresses')}
          </Text>
          {addresses.length > 0 ? (
            <View style={styles.savedAddresses}>
              {addresses.map(address => (
                <SavedAddressCard
                  key={address._id}
                  styles={styles}
                  address={address}
                  selected={selectedAddressId === address._id}
                  onPress={() => setSelectedAddressId(address._id)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptySavedBox}>
              <Text style={styles.emptySavedTitle}>
                {t('shipping.noSavedAddress')}
              </Text>
              <Text style={styles.emptySavedText}>
                {t('shipping.addFirstAddress')}
              </Text>
            </View>
          )}
          <View style={styles.addCard}>
            <Text style={styles.sectionTitle}>
              {t('shipping.addNewAddress')}
            </Text>
            <Text style={styles.formSubtitle}>
              {t('shipping.formSubtitle')}
            </Text>
            <Pressable
              style={styles.addButton}
              onPress={() => setModalOpen(true)}
              accessibilityRole="button"
            >
              <Text style={styles.addButtonText}>
                {t('shipping.openAddressForm')}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
      <AddAddressModal
        visible={modalOpen}
        hasExistingAddresses={addresses.length > 0}
        onClose={() => setModalOpen(false)}
        onSaved={async address => {
          await refetch();
          setSelectedAddressId(address._id);
          setModalOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

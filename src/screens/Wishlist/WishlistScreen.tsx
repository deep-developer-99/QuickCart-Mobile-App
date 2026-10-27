import React from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getWishlistProducts,
  useGetWishlistQuery,
} from '../../api/quickCartApi';
import { spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import EmptyWishlist from './EmptyWishlist';
import WishlistProducts from './WishlistProducts';
import BackButton from '../../components/common/BackButton';

const WishlistScreen = () => {
  const { t } = useTranslation();
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const {
    data: wishlistResponse,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetWishlistQuery(undefined, {
    refetchOnMountOrArgChange: true,
  });

  const wishlistProducts = getWishlistProducts(wishlistResponse);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <WishlistHeader navigation={navigation} styles={styles} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{t('ui.wishlist.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <WishlistHeader navigation={navigation} styles={styles} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>{t('ui.wishlist.loadError')}</Text>
          <Text style={styles.errorText}>
            {t('ui.wishlist.loadErrorDescription')}
          </Text>
          <Text style={styles.retryText} onPress={() => refetch()}>
            {t('common.tryAgain')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <WishlistHeader navigation={navigation} styles={styles} />
      {wishlistProducts.length === 0 ? (
        <EmptyWishlist />
      ) : (
        <WishlistProducts products={wishlistProducts} />
      )}

      {isFetching && wishlistProducts.length > 0 ? (
        <View style={styles.refreshIndicator} pointerEvents="none">
          <ActivityIndicator size="small" />
        </View>
      ) : null}
    </SafeAreaView>
  );
};

const WishlistHeader = ({
  navigation,
  styles,
}: {
  navigation: any;
  styles: ReturnType<typeof createStyles>;
}) => {
  const { t } = useTranslation();
  return (
  <View style={styles.header}>
    <BackButton
      style={styles.backButton}
      onPress={() => navigation.canGoBack() && navigation.goBack()}
      hitSlop={10}
    />
    <Text style={styles.headerTitle}>{t('ui.wishlist.title')}</Text>
  </View>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      height: 61,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
      borderBottomWidth: 1,
      borderBottomColor: colors.grey50,
    },
    backButton: {
      width: 32,
      height: 40,
      alignItems: 'flex-start',
      justifyContent: 'center',
    },
    backIcon: {
      fontSize: 31,
      lineHeight: 34,
      color: colors.text,
      fontWeight: '300',
    },
    headerTitle: {
      ...typography.body1Regular,
      color: colors.text,
      marginLeft: 8,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    loadingText: {
      ...typography.body2Regular,
      color: colors.secondaryText,
      marginTop: 10,
    },
    errorContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 32,
    },
    errorTitle: {
      ...typography.heading3SemiBold,
      color: colors.text,
      textAlign: 'center',
    },
    errorText: {
      ...typography.body2Regular,
      color: colors.secondaryText,
      textAlign: 'center',
      marginTop: 8,
    },
    retryText: {
      ...typography.body2Medium,
      color: colors.cyan,
      marginTop: 18,
    },
    refreshIndicator: {
      position: 'absolute',
      top: 8,
      right: 16,
    },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default WishlistScreen;

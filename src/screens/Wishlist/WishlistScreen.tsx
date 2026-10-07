import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  getWishlistProducts,
  useGetWishlistQuery,
} from '../../api/quickCartApi';
import { colors, typography } from '../../theme';
import EmptyWishlist from './EmptyWishlist';
import WishlistProducts from './WishlistProducts';

const WishlistScreen = () => {
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>Loading wishlist...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Unable to load wishlist</Text>
          <Text style={styles.errorText}>
            Please check your connection and try again.
          </Text>
          <Text style={styles.retryText} onPress={() => refetch()}>
            Try Again
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    ...typography.body2Regular,
    color: '#777B89',
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
    color: colors.black,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body2Regular,
    color: '#777B89',
    textAlign: 'center',
    marginTop: 8,
  },
  retryText: {
    ...typography.body2Medium,
    color: '#21D4B4',
    marginTop: 18,
  },
  refreshIndicator: {
    position: 'absolute',
    top: 8,
    right: 16,
  },
});

export default WishlistScreen;

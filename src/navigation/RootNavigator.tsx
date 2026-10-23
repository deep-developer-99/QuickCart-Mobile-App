import { useTheme } from '../theme';
import type { ThemeColors } from '../theme';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import {
  NavigationContainer,
  type LinkingOptions,
  type NavigatorScreenParams,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator, { type MainTabParamList } from './MainTabNavigator';

import SearchScreen from '../screens/search/SearchScreen';
import OrderHistoryScreen from '../screens/OrderHistory/OrderHistoryScreen';
import OrderDetailsScreen from '../screens/OrderDetails/OrderDetailsScreen';
import ProductDetailsScreen from '../screens/ProductDetails/ProductDetailsScreen';
import CheckoutScreen from '../screens/Checkout/CheckoutScreen';
import ShippingAddressScreen from '../screens/ShippingAddress/ShippingAddressScreen';
import PaymentMethodScreen from '../screens/PaymentMethod/PaymentMethodScreen';

import type { CartProduct } from '../api/quickCartApi';
import { useLazyGetMeQuery } from '../api/quickCartApi';
import { getToken, removeToken } from '../services/secureStorage';
import { logout, setCredentials } from '../store/slices/authSlice';
import type { AppDispatch, RootState } from '../store/store';
import {
  consumePendingProductId,
  parseProductUrl,
  PRODUCT_LINK_HOST,
  setPendingProductId,
} from '../services/productLinks';

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Search: { categoryId?: string } | undefined;
  OrderHistory: undefined;
  OrderDetails: {
    order?: import('../api/orderApi').MyOrder;
    orderId?: string;
  };

  // ProductDetails receives the product selected from Home/Categories/Wishlist.
  ProductDetails: {
    product: CartProduct;
  } | {
    productId: string;
  };

  Checkout:
    | {
        mode: 'cart' | 'buyNow';
        product?: CartProduct;
        quantity?: number;
      }
    | undefined;
  ShippingAddress: undefined;
  PaymentMethod: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const RootNavigator = ({ onReady }: { onReady?: () => void }) => {
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pendingProductRoute, setPendingProductRoute] = useState<string | null>(
    null,
  );
  const [getMe, { isLoading }] = useLazyGetMeQuery();
  const lastHandledUrl = useRef({ value: '', at: 0 });

  const handleIncomingUrl = useCallback(
    (url: string) => {
      const productId = parseProductUrl(url);
      if (!productId) return;

      const now = Date.now();
      if (
        lastHandledUrl.current.value === url &&
        now - lastHandledUrl.current.at < 1500
      ) {
        return;
      }
      lastHandledUrl.current = { value: url, at: now };

      if (!isAuthenticated) {
        setPendingProductId(productId);
        setPendingProductRoute(productId);
        return;
      }

      if (navigationRef.isReady()) {
        navigationRef.navigate('ProductDetails', { productId });
      }
    },
    [isAuthenticated],
  );

  const linking = React.useMemo<LinkingOptions<RootStackParamList>>(
    () => ({
      prefixes: PRODUCT_LINK_HOST ? [`https://${PRODUCT_LINK_HOST}`] : [],
      config: {
        screens: {
          ProductDetails: {
            path: 'products/:productId',
            parse: { productId: (value: string) => value },
          },
        },
      },
      getInitialURL: async () => {
        const initialUrl = await Linking.getInitialURL();
        if (!initialUrl) return null;
        const productId = parseProductUrl(initialUrl);
        if (!productId) return null;
        if (!isAuthenticated) {
          setPendingProductId(productId);
          setPendingProductRoute(productId);
          return null;
        }
        lastHandledUrl.current = { value: initialUrl, at: Date.now() };
        return initialUrl;
      },
      subscribe: () => {
        const subscription = Linking.addEventListener('url', ({ url }) => {
          const productId = parseProductUrl(url);
          if (!productId) return;
          // Route validated links here so logged-out recipients can authenticate first.
          handleIncomingUrl(url);
        });
        return () => subscription.remove();
      },
    }),
    [handleIncomingUrl, isAuthenticated],
  );

  useEffect(() => {
    if (!isAuthenticated || !navigationRef.isReady()) return;
    const productId = consumePendingProductId();
    if (productId) {
      setPendingProductRoute(null);
      const frame = requestAnimationFrame(() => {
        if (navigationRef.isReady()) {
          navigationRef.navigate('ProductDetails', { productId });
        }
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [isAuthenticated]);

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const token = await getToken();

        if (!token) {
          if (mounted) {
            setCheckingAuth(false);
          }
          return;
        }

        const response = await getMe().unwrap();

        if (mounted && response.success) {
          dispatch(
            setCredentials({
              user: response.data,
              token,
            }),
          );
        } else if (mounted) {
          await removeToken();
          dispatch(logout());
        }
      } catch (error) {
        console.log('Session restore failed:', error);

        if (mounted) {
          await removeToken();
          dispatch(logout());
        }
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [dispatch, getMe]);

  if (checkingAuth || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef} linking={linking} onReady={() => {
      if (isAuthenticated) {
        const productId = consumePendingProductId();
        if (productId) {
          setPendingProductRoute(null);
          navigationRef.navigate('ProductDetails', { productId });
        }
      }
      import('../services/pushNotifications').then(({ flushPendingNotification }) => {
        flushPendingNotification();
      });
      onReady?.();
    }}>
      {isAuthenticated ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="MainTabs" component={MainTabNavigator} />

          <Stack.Screen name="Search" component={SearchScreen} />

          <Stack.Screen name="OrderHistory" component={OrderHistoryScreen} />
          <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />

          <Stack.Screen
            name="ProductDetails"
            component={ProductDetailsScreen}
          />

          <Stack.Screen name="Checkout" component={CheckoutScreen} />
          <Stack.Screen
            name="ShippingAddress"
            component={ShippingAddressScreen}
          />
          <Stack.Screen name="PaymentMethod" component={PaymentMethodScreen} />
        </Stack.Navigator>
      ) : (
        <AuthNavigator
          key={pendingProductRoute ? 'product-login' : 'auth'}
          initialRouteName={pendingProductRoute ? 'Login' : 'Splash'}
        />
      )}
    </NavigationContainer>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    loadingContainer: {
      flex: 1,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default RootNavigator;

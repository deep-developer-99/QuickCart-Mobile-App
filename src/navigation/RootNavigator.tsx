import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import {
  NavigationContainer,
  type LinkingOptions,
  type NavigatorScreenParams,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';

import FloatingViewCart from '../components/FloatingViewCart';
import AuthNavigator from './AuthNavigator';
import MainTabNavigator, { type MainTabParamList } from './MainTabNavigator';
import { SplashScreenContent } from '../screens/splash/SplashScreen';

import SearchScreen from '../screens/search/SearchScreen';
import OrderHistoryScreen from '../screens/OrderHistory/OrderHistoryScreen';
import OrderDetailsScreen from '../screens/OrderDetails/OrderDetailsScreen';
import ProductDetailsScreen from '../screens/ProductDetails/ProductDetailsScreen';
import CheckoutScreen from '../screens/Checkout/CheckoutScreen';
import CartScreen from '../screens/Cart/CartScreen';
import DeleteAccountScreen from '../screens/Profile/DeleteAccountScreen';
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
  Search: { categoryId?: string; voiceSearchQuery?: string; voiceSearchRequestId?: string } | undefined;
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

  Checkout: undefined;
  Cart: undefined;
  ShippingAddress: undefined;
  DeleteAccount: undefined;
  PaymentMethod: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const RootNavigator = ({ onReady }: { onReady?: () => void }) => {
  const dispatch = useDispatch<AppDispatch>();

  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [pendingProductRoute, setPendingProductRoute] = useState<string | null>(
    null,
  );
  const [getMe, { isLoading }] = useLazyGetMeQuery();
  const [activeRouteName, setActiveRouteName] = useState<string>();
  const openingCart = useRef(false);
  const updateActiveRoute = useCallback(() => {
    const name = navigationRef.isReady() ? navigationRef.getCurrentRoute()?.name : undefined;
    setActiveRouteName(name);
    openingCart.current = false;
  }, []);
  const openCart = useCallback(() => {
    if (!navigationRef.isReady() || openingCart.current) return;
    const name = navigationRef.getCurrentRoute()?.name;
    if (!['Home', 'Categories', 'Wishlist', 'Search', 'ProductDetails'].includes(name ?? '')) return;
    openingCart.current = true;
    navigationRef.navigate('Cart');
  }, []);
  useEffect(() => {
    if (checkingAuth || isLoading) setActiveRouteName(undefined);
    else updateActiveRoute();
    openingCart.current = false;
  }, [checkingAuth, isLoading, isAuthenticated, updateActiveRoute]);

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
      const invalidateSession = async () => {
        try {
          await removeToken();
        } catch (error) {
          console.warn('Failed to remove invalid session token:', error);
        } finally {
          dispatch(logout());
        }
      };

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
          const userId = response.data.id ?? response.data._id;
          if (typeof userId === 'string' && userId.trim()) {
            dispatch(
              setCredentials({
                user: { ...response.data, id: userId.trim() },
                token,
              }),
            );
          } else {
            console.warn('Session restore returned a user without an ID.');
            await invalidateSession();
          }
        } else if (mounted) {
          await invalidateSession();
        }
      } catch (error) {
        console.log('Session restore failed:', error);

        if (mounted) {
          await invalidateSession();
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
    return <SplashScreenContent />;
  }

  return (
    <View style={styles.container}>
    <NavigationContainer ref={navigationRef} linking={linking} onStateChange={updateActiveRoute} onReady={() => {
      updateActiveRoute();
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
          <Stack.Screen name="Cart" component={CartScreen} />
          <Stack.Screen
            name="DeleteAccount"
            component={DeleteAccountScreen}
            options={{ headerShown: true, title: 'Delete account' }}
          />
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
    {isAuthenticated && <FloatingViewCart activeRouteName={activeRouteName} onPress={openCart} />}
    </View>
  );
};

const styles = StyleSheet.create({ container: { flex: 1 } });

export default RootNavigator;

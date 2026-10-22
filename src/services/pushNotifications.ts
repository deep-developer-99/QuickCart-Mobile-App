import { Platform } from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  onMessage,
  onNotificationOpenedApp,
  onTokenRefresh,
  registerDeviceForRemoteMessages,
  requestPermission,
  type RemoteMessage,
} from '@react-native-firebase/messaging';

import { quickCartApi } from '../api/quickCartApi';
import { store } from '../store/store';
import { navigationRef } from '../navigation/RootNavigator';
import type { CartProduct } from '../api/quickCartApi';

export type NotificationData = {
  event?: string;
  type?: string;
  orderId?: string;
  status?: string;
  notificationId?: string;
  role?: string;
  offerId?: string;
  title?: string;
  message?: string;
  redirectType?: string;
  redirectValue?: string;
};

type ForegroundMessage = {
  data: NotificationData;
  title: string;
  message: string;
};

let pendingNotification: NotificationData | null = null;

const isCustomer = (role: string | undefined) =>
  role === 'user' || role === 'customer';

const getData = (
  message: RemoteMessage,
): NotificationData => message.data as NotificationData;

export const getForegroundMessage = (
  message: RemoteMessage,
): ForegroundMessage | null => {
  const data = getData(message);
  if (!isSupportedNotification(data)) return null;

  return {
    data,
    title:
      data.title?.trim() || message.notification?.title?.trim() || 'QuickCart',
    message:
      data.message?.trim() ||
      message.notification?.body?.trim() ||
      (data.event === 'ORDER_STATUS_UPDATED'
        ? `Order status updated to ${data.status ?? 'updated'}`
        : 'A new offer is available'),
  };
};

export const isSupportedNotification = (data: NotificationData) => {
  if (!isCustomer(data.role)) return false;

  const event = data.event ?? data.type;
  if (event === 'ORDER_STATUS_UPDATED') return Boolean(data.orderId);

  return (
    event === 'NEW_OFFER' &&
    Boolean(data.offerId) &&
    (data.redirectType === 'category' || data.redirectType === 'product') &&
    Boolean(data.redirectValue)
  );
};

const navigateToNotification = async (data: NotificationData) => {
  if (!isSupportedNotification(data)) return;

  if (!navigationRef.isReady()) {
    pendingNotification = data;
    return;
  }

  const event = data.event ?? data.type;
  if (event === 'ORDER_STATUS_UPDATED' && data.orderId) {
    navigationRef.navigate('OrderDetails', { orderId: data.orderId });
    return;
  }

  if (event === 'NEW_OFFER' && data.redirectType === 'category') {
    navigationRef.navigate('MainTabs', {
      screen: 'Categories',
      params: { categoryId: data.redirectValue },
    } as any);
    return;
  }

  if (event === 'NEW_OFFER' && data.redirectType === 'product') {
    const response = await store.dispatch(
      quickCartApi.endpoints.getProducts.initiate(undefined, {
        forceRefetch: true,
      }),
    );
    const products = Array.isArray(response.data?.data) ? response.data.data : [];
    const product = products.find(item => item._id === data.redirectValue) as
      | CartProduct
      | undefined;

    if (product) {
      navigationRef.navigate('ProductDetails', { product });
    } else {
      navigationRef.navigate('MainTabs', { screen: 'Home' });
    }
  }
};

export const handleNotificationOpen = (data: NotificationData) => {
  navigateToNotification(data).catch(error => {
    console.warn('Failed to handle notification navigation:', error);
    if (navigationRef.isReady()) {
      navigationRef.navigate('MainTabs', { screen: 'Home' });
    }
  });
};

export const flushPendingNotification = () => {
  if (!pendingNotification || !navigationRef.isReady()) return;
  const data = pendingNotification;
  pendingNotification = null;
  handleNotificationOpen(data);
};

export const registerCurrentDeviceToken = async () => {
  const token = await getToken(getMessaging());
  if (!token) return null;

  await store.dispatch(
    quickCartApi.endpoints.registerFcmToken.initiate({ token }),
  ).unwrap();
  return token;
};

export const removeCurrentDeviceToken = async () => {
  try {
    const token = await getToken(getMessaging());
    if (!token) return;
    await store.dispatch(
      quickCartApi.endpoints.removeFcmToken.initiate({ token }),
    ).unwrap();
  } catch (error) {
    console.warn('Failed to remove FCM token:', error);
  }
};

export const configurePushNotifications = async (
  onForegroundMessage: (message: ForegroundMessage) => void,
) => {
  if (Platform.OS === 'ios') {
    await registerDeviceForRemoteMessages(getMessaging());
    const status = await requestPermission(getMessaging());
    if (
      status !== AuthorizationStatus.AUTHORIZED &&
      status !== AuthorizationStatus.PROVISIONAL
    ) {
      return () => undefined;
    }
  } else {
    await requestPermission(getMessaging());
  }

  await registerCurrentDeviceToken();

  const unsubscribeMessage = onMessage(getMessaging(), (message: RemoteMessage) => {
    const foregroundMessage = getForegroundMessage(message);
    if (foregroundMessage) onForegroundMessage(foregroundMessage);
  });
  const unsubscribeToken = onTokenRefresh(getMessaging(), (token: string) => {
    store
      .dispatch(quickCartApi.endpoints.registerFcmToken.initiate({ token }))
      .unwrap()
      .catch(error => console.warn('Failed to refresh FCM token:', error));
  });
  const unsubscribeOpened = onNotificationOpenedApp(
    getMessaging(),
    (message: RemoteMessage) => {
    handleNotificationOpen(getData(message));
    },
  );

  const initialMessage = await getInitialNotification(getMessaging());
  if (initialMessage) handleNotificationOpen(getData(initialMessage));

  return () => {
    unsubscribeMessage();
    unsubscribeToken();
    unsubscribeOpened();
  };
};

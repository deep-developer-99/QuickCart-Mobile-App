import { Linking, Platform } from 'react-native';
import {
  AuthorizationStatus,
  getInitialNotification,
  getMessaging,
  getToken,
  hasPermission,
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
  timestamp?: string;
};

type ForegroundMessage = {
  data: NotificationData;
  title: string;
  message: string;
  timestamp?: number;
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
    timestamp:
      message.sentTime ??
      (data.timestamp && Number.isFinite(Number(data.timestamp))
        ? Number(data.timestamp)
        : undefined),
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

export const registerCurrentDeviceToken = async (
  isActive: () => boolean = () => true,
) => {
  if (!isActive()) return null;
  const token = await getToken(getMessaging());
  if (!token || !isActive()) return null;

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

export const openNotificationSettings = async () => {
  try {
    await Linking.openSettings();
  } catch (error) {
    console.warn('Failed to open notification settings:', error);
  }
};

export const configurePushNotifications = async (
  onForegroundMessage: (message: ForegroundMessage) => void,
  onPermissionDenied?: () => void,
  isActive: () => boolean = () => true,
) => {
  const messaging = getMessaging();

  if (Platform.OS === 'ios') {
    await registerDeviceForRemoteMessages(messaging);
  }

  let permissionStatus: number = AuthorizationStatus.AUTHORIZED;
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    permissionStatus = await hasPermission(messaging);
    if (permissionStatus === AuthorizationStatus.NOT_DETERMINED) {
      permissionStatus = await requestPermission(messaging);
    }
  } else if (Platform.OS === 'ios') {
    permissionStatus = await hasPermission(messaging);
    if (permissionStatus === AuthorizationStatus.NOT_DETERMINED) {
      permissionStatus = await requestPermission(messaging);
    }
  }

  const permissionGranted =
    permissionStatus === AuthorizationStatus.AUTHORIZED ||
    permissionStatus === AuthorizationStatus.PROVISIONAL;
  if (!isActive()) return () => undefined;
  if (!permissionGranted) onPermissionDenied?.();
  if (permissionGranted) await registerCurrentDeviceToken(isActive);
  if (!isActive()) return () => undefined;

  const unsubscribeMessage = onMessage(messaging, (message: RemoteMessage) => {
    const foregroundMessage = getForegroundMessage(message);
    if (foregroundMessage) onForegroundMessage(foregroundMessage);
  });
  const unsubscribeToken = onTokenRefresh(messaging, (token: string) => {
    if (!permissionGranted || !isActive()) return;
    store
      .dispatch(quickCartApi.endpoints.registerFcmToken.initiate({ token }))
      .unwrap()
      .catch(error => console.warn('Failed to refresh FCM token:', error));
  });
  const unsubscribeOpened = onNotificationOpenedApp(
    messaging,
    (message: RemoteMessage) => {
    handleNotificationOpen(getData(message));
    },
  );

  const initialMessage = await getInitialNotification(messaging);
  if (initialMessage) handleNotificationOpen(getData(initialMessage));

  return () => {
    unsubscribeMessage();
    unsubscribeToken();
    unsubscribeOpened();
  };
};

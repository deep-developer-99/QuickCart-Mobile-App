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
  action?: string;
  actionType?: string;
  timestamp?: string;
};

type ForegroundMessage = {
  data: NotificationData;
  title: string;
  message: string;
  timestamp?: number;
};

const OBJECT_ID = /^[a-f\d]{24}$/i;
let pendingNotification: NotificationData | null = null;
let lastNavigationKey = '';
let lastNavigationAt = 0;
let registeredToken: string | null = null;
let configureVersion = 0;
let listenerCleanup: (() => void) | null = null;

const isCustomer = (role: string | undefined) =>
  role === 'user' || role === 'customer';

const safeString = (value: unknown, maxLength = 500): string | undefined =>
  typeof value === 'string' && value.trim()
    ? value.trim().slice(0, maxLength)
    : undefined;

const getData = (message: RemoteMessage): NotificationData => {
  const raw: unknown = message.data;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const data = raw as Record<string, unknown>;
  return {
    event: safeString(data.event, 64),
    type: safeString(data.type, 64),
    orderId: safeString(data.orderId, 64),
    status: safeString(data.status, 80),
    notificationId: safeString(data.notificationId, 100),
    role: safeString(data.role, 32),
    offerId: safeString(data.offerId, 64),
    title: safeString(data.title, 120),
    message: safeString(data.message, 240),
    redirectType: safeString(data.redirectType, 32),
    redirectValue: safeString(data.redirectValue, 64),
    action: safeString(data.action, 32),
    actionType: safeString(data.actionType, 32),
    timestamp: safeString(data.timestamp ?? data.createdAt, 64),
  };
};

const eventOf = (data: NotificationData) => data.event ?? data.type;

export const isSupportedNotification = (data: NotificationData) => {
  if (!isCustomer(data.role)) return false;
  const event = eventOf(data);
  if (event === 'ORDER_STATUS_UPDATED') {
    return Boolean(data.orderId && OBJECT_ID.test(data.orderId));
  }
  if (event === 'NEW_OFFER') {
    return Boolean(data.offerId && OBJECT_ID.test(data.offerId));
  }
  return event === 'CUSTOM' || event === 'CUSTOM_MESSAGE';
};

const readableStatus = (status: string | undefined) => {
  const normalized = status?.trim().toLowerCase();
  const known: Record<string, string> = {
    placed: 'placed',
    accepted: 'accepted',
    'out for delivery': 'out for delivery',
    delivered: 'delivered',
  };
  return normalized && known[normalized] ? known[normalized] : 'updated';
};

export const getForegroundMessage = (
  message: RemoteMessage,
): ForegroundMessage | null => {
  const data = getData(message);
  if (!isSupportedNotification(data)) return null;
  const event = eventOf(data);
  return {
    data,
    title:
      data.title ?? safeString(message.notification?.title, 120) ?? 'QuickCart',
    message:
      data.message ??
      safeString(message.notification?.body, 240) ??
      (event === 'ORDER_STATUS_UPDATED'
        ? `Order status ${readableStatus(data.status)}`
        : event === 'NEW_OFFER'
        ? 'A new offer is available'
        : 'You have a new notification'),
    timestamp:
      message.sentTime ??
      (data.timestamp && Number.isFinite(Number(data.timestamp))
        ? Number(data.timestamp)
        : undefined),
  };
};

const goHome = () => {
  if (navigationRef.isReady()) {
    navigationRef.navigate('MainTabs', { screen: 'Home' });
  }
};

const navigateToProduct = async (productId: string) => {
  if (!OBJECT_ID.test(productId)) return goHome();
  const result = await store.dispatch(
    quickCartApi.endpoints.getProductById.initiate(productId, {
      forceRefetch: true,
    }),
  );
  const product = result.data?.data as CartProduct | undefined;
  if (!product || product._id !== productId) return goHome();
  navigationRef.navigate('ProductDetails', { product });
};

const navigateToCategory = async (categoryId: string) => {
  if (!OBJECT_ID.test(categoryId)) return goHome();
  const result = await store.dispatch(
    quickCartApi.endpoints.getCategories.initiate(undefined, {
      forceRefetch: true,
    }),
  );
  const category = result.data?.data?.find(item => item._id === categoryId);
  if (!category) return goHome();
  navigationRef.navigate('MainTabs', {
    screen: 'Categories',
    params: { categoryId },
  } as any);
};

const navigateToOffer = async (data: NotificationData) => {
  if (!data.offerId || !OBJECT_ID.test(data.offerId)) return goHome();
  const result = await store.dispatch(
    quickCartApi.endpoints.getPublishedOffer.initiate(data.offerId, {
      forceRefetch: true,
    }),
  );
  const offer = result.data?.data;
  if (!offer || offer._id !== data.offerId) return goHome();
  if (offer.redirectType === 'product') {
    await navigateToProduct(offer.redirectValue);
  } else if (offer.redirectType === 'category') {
    await navigateToCategory(offer.redirectValue);
  } else {
    goHome();
  }
};

const navigateToNotification = async (data: NotificationData) => {
  if (!isSupportedNotification(data)) return;
  if (!navigationRef.isReady()) {
    pendingNotification = data;
    return;
  }
  const user = store.getState().auth.user;
  if (!user || !isCustomer(user.role)) {
    pendingNotification = data;
    return;
  }

  const event = eventOf(data);
  if (event === 'ORDER_STATUS_UPDATED' && data.orderId) {
    navigationRef.navigate('OrderDetails', { orderId: data.orderId });
    return;
  }
  if (event === 'NEW_OFFER') {
    await navigateToOffer(data);
    return;
  }

  // CUSTOM currently carries no navigation metadata in the backend contract.
  // Only explicitly recognized actions are honored if a future payload adds them.
  const action = data.action ?? data.actionType ?? data.redirectType;
  const value = data.redirectValue;
  if (action === 'product' && value) return navigateToProduct(value);
  if (action === 'category' && value) return navigateToCategory(value);
  if (action === 'offer' && data.offerId) return navigateToOffer(data);
  if (action === 'order' && data.orderId && OBJECT_ID.test(data.orderId)) {
    navigationRef.navigate('OrderDetails', { orderId: data.orderId });
    return;
  }
  goHome();
};

const notificationKey = (data: NotificationData) =>
  data.notificationId ??
  [
    eventOf(data),
    data.orderId ?? data.offerId ?? data.redirectValue,
    data.status,
    data.title,
    data.message,
    data.timestamp,
  ]
    .filter(Boolean)
    .join(':');

export const handleNotificationOpen = (input: NotificationData) => {
  const data = getData({ data: input } as RemoteMessage);
  if (!isSupportedNotification(data)) return;
  const key = notificationKey(data);
  const now = Date.now();
  if (key && key === lastNavigationKey && now - lastNavigationAt < 2500) return;
  lastNavigationKey = key;
  lastNavigationAt = now;
  navigateToNotification(data).catch(error => {
    console.warn('Failed to handle notification navigation:', error);
    goHome();
  });
};

export const flushPendingNotification = () => {
  if (!pendingNotification || !navigationRef.isReady()) return;
  const user = store.getState().auth.user;
  if (!user || !isCustomer(user.role)) return;
  const data = pendingNotification;
  pendingNotification = null;
  navigateToNotification(data).catch(error => {
    console.warn('Failed to handle pending notification navigation:', error);
    goHome();
  });
};

export const registerCurrentDeviceToken = async (
  isActive: () => boolean = () => true,
) => {
  if (!isActive()) return null;
  const token = await getToken(getMessaging());
  if (!token || !isActive()) return null;
  if (token === registeredToken) return token;
  await store
    .dispatch(quickCartApi.endpoints.registerFcmToken.initiate({ token }))
    .unwrap();
  registeredToken = token;
  return token;
};

export const removeCurrentDeviceToken = async () => {
  try {
    const token = await getToken(getMessaging());
    if (token) {
      await store
        .dispatch(quickCartApi.endpoints.removeFcmToken.initiate({ token }))
        .unwrap();
    }
  } catch (error) {
    console.warn('Failed to remove FCM token:', error);
  } finally {
    registeredToken = null;
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
  listenerCleanup?.();
  listenerCleanup = null;
  const version = ++configureVersion;
  const messaging = getMessaging();

  if (Platform.OS === 'ios') {
    try {
      await registerDeviceForRemoteMessages(messaging);
    } catch (error) {
      console.warn('Failed to register for remote messages:', error);
    }
  }

  let permissionStatus: number = AuthorizationStatus.AUTHORIZED;
  try {
    if (
      (Platform.OS === 'android' && Platform.Version >= 33) ||
      Platform.OS === 'ios'
    ) {
      permissionStatus = await hasPermission(messaging);
      if (permissionStatus === AuthorizationStatus.NOT_DETERMINED) {
        permissionStatus = await requestPermission(messaging);
      }
    }
  } catch (error) {
    permissionStatus = AuthorizationStatus.DENIED;
    console.warn('Notification permission check failed:', error);
  }

  const permissionGranted =
    permissionStatus === AuthorizationStatus.AUTHORIZED ||
    permissionStatus === AuthorizationStatus.PROVISIONAL;
  if (version !== configureVersion || !isActive()) return () => undefined;
  if (!permissionGranted) onPermissionDenied?.();
  if (permissionGranted && isCustomer(store.getState().auth.user?.role)) {
    try {
      await registerCurrentDeviceToken(isActive);
    } catch (error) {
      console.warn('FCM token registration failed:', error);
    }
  }
  if (version !== configureVersion || !isActive()) return () => undefined;

  const unsubscribeMessage = onMessage(messaging, (message: RemoteMessage) => {
    const foregroundMessage = getForegroundMessage(message);
    if (foregroundMessage && isActive()) onForegroundMessage(foregroundMessage);
  });
  const unsubscribeToken = onTokenRefresh(messaging, (token: string) => {
    if (!permissionGranted || !isActive() || token === registeredToken) return;
    store
      .dispatch(quickCartApi.endpoints.registerFcmToken.initiate({ token }))
      .unwrap()
      .then(() => {
        registeredToken = token;
      })
      .catch(error => console.warn('Failed to refresh FCM token:', error));
  });
  const unsubscribeOpened = onNotificationOpenedApp(
    messaging,
    (message: RemoteMessage) => handleNotificationOpen(getData(message)),
  );

  const cleanup = () => {
    if (version !== configureVersion) return;
    configureVersion += 1;
    unsubscribeMessage();
    unsubscribeToken();
    unsubscribeOpened();
    listenerCleanup = null;
  };
  listenerCleanup = cleanup;

  getInitialNotification(messaging)
    .then(initialMessage => {
      if (version === configureVersion && initialMessage) {
        handleNotificationOpen(getData(initialMessage));
      }
    })
    .catch(error =>
      console.warn('Failed to read initial notification:', error),
    );
  flushPendingNotification();
  return cleanup;
};

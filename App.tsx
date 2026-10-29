import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { restoreLanguage } from './src/i18n';
import { useSelector } from 'react-redux';
import type { RootState } from './src/store/store';
import {
  configurePushNotifications,
  handleNotificationOpen,
  type NotificationData,
} from './src/services/pushNotifications';
import InAppNotification from './src/components/InAppNotification';

const PushNotificationManager = ({
  navigationReady,
}: {
  navigationReady: boolean;
}) => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [foregroundNotification, setForegroundNotification] = React.useState<{
    data: NotificationData;
    title: string;
    message: string;
    timestamp?: number;
  } | null>(null);
  const [notificationKey, setNotificationKey] = React.useState<string | null>(
    null,
  );
  const notificationKeyRef = React.useRef<{ key: string; at: number } | null>(
    null,
  );
  React.useEffect(() => {
    if (
      !navigationReady ||
      !user ||
      (user.role !== 'user' && user.role !== 'customer')
    )
      return;

    let cleanup: (() => void) | undefined;
    let active = true;

    configurePushNotifications(
      notification => {
        if (!active) return;
        const key =
          notification.data.notificationId ||
          [
            notification.data.event ?? notification.data.type,
            notification.data.orderId ?? notification.data.offerId,
            notification.title,
            notification.message,
            notification.timestamp,
          ].join(':');
        const now = Date.now();
        if (
          key === notificationKeyRef.current?.key &&
          now - notificationKeyRef.current.at < 2500
        )
          return;
        notificationKeyRef.current = { key, at: now };
        setNotificationKey(key);
        setForegroundNotification(notification);
        setForegroundNotification(notification);
      },
      () => active,
    )
      .then(unsubscribe => {
        cleanup = unsubscribe;
      })
      .catch(error => {
        console.warn('Push notification setup failed:', error);
      });

    return () => {
      active = false;
      cleanup?.();
    };
  }, [navigationReady, user]);

  if (!foregroundNotification) return null;

  return (
    <InAppNotification
      key={notificationKey ?? foregroundNotification.title}
      title={foregroundNotification.title}
      message={foregroundNotification.message}
      timestamp={foregroundNotification.timestamp}
      data={foregroundNotification.data}
      onPress={handleNotificationOpen}
      onDismiss={() => setForegroundNotification(null)}
    />
  );
};

const ThemedApp = () => {
  const { mode } = useTheme();
  const [navigationReady, setNavigationReady] = React.useState(false);

  useEffect(() => {
    restoreLanguage().catch(error => {
      console.warn('Failed to restore language preference:', error);
    });
  }, []);

  return (
    <>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <RootNavigator onReady={() => setNavigationReady(true)} />
      <PushNotificationManager navigationReady={navigationReady} />
    </>
  );
};

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedApp />
        </ThemeProvider>
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;

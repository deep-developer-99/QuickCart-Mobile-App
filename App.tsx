import React, { useEffect } from 'react';
import { Pressable, StatusBar, StyleSheet, Text, View } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/theme/globalFont';

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

const PushNotificationManager = () => {
  const user = useSelector((state: RootState) => state.auth.user);
  const [foregroundNotification, setForegroundNotification] = React.useState<{
    data: NotificationData;
    title: string;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!user || (user.role !== 'user' && user.role !== 'customer')) return;

    let cleanup: (() => void) | undefined;
    let active = true;

    configurePushNotifications(notification => {
      if (active) setForegroundNotification(notification);
    })
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
  }, [user]);

  if (!foregroundNotification) return null;

  return (
    <Pressable
      style={styles.notificationBanner}
      onPress={() => {
        handleNotificationOpen(foregroundNotification.data);
        setForegroundNotification(null);
      }}
      onLongPress={() => setForegroundNotification(null)}
    >
      <View style={styles.notificationCopy}>
        <Text style={styles.notificationTitle} numberOfLines={1}>
          {foregroundNotification.title}
        </Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {foregroundNotification.message}
        </Text>
      </View>
      <Text style={styles.notificationClose}>×</Text>
    </Pressable>
  );
};

const ThemedApp = () => {
  const { mode } = useTheme();

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
      <RootNavigator />
      <PushNotificationManager />
    </>
  );
};

const styles = StyleSheet.create({
  notificationBanner: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#17171A',
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  notificationCopy: { flex: 1 },
  notificationTitle: {
    color: '#FFFFFF',
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 13,
  },
  notificationMessage: {
    color: '#E8E8EA',
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
    marginTop: 3,
  },
  notificationClose: { color: '#FFFFFF', fontSize: 24, marginLeft: 10 },
});

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

import { AppText as Text } from './AppText';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../theme';
import type { NotificationData } from '../services/pushNotifications';

type Props = {
  title: string;
  message: string;
  timestamp?: number;
  data: NotificationData;
  onPress: (data: NotificationData) => void;
  onDismiss: () => void;
};

const AUTO_DISMISS_MS = 4500;
const SWIPE_DISTANCE_RATIO = 0.25;
const SWIPE_VELOCITY = 0.6;

const formatTimestamp = (timestamp?: number) => {
  if (!timestamp || !Number.isFinite(timestamp)) return null;

  return new Date(timestamp).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
};

const InAppNotification = ({
  title,
  message,
  timestamp,
  data,
  onPress,
  onDismiss,
}: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const styles = createStyles(theme.colors);
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-24)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissing = useRef(false);
  const timestampLabel = formatTimestamp(timestamp);

  const clearDismissTimer = useCallback(() => {
    if (dismissTimer.current) {
      clearTimeout(dismissTimer.current);
      dismissTimer.current = null;
    }
  }, []);

  const dismiss = useCallback(
    (direction: 1 | -1 = 1) => {
      if (dismissing.current) return;
      dismissing.current = true;
      clearDismissTimer();

      Animated.parallel([
        Animated.timing(translateX, {
          toValue: direction * (width + 80),
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) onDismiss();
      });
    },
    [clearDismissTimer, onDismiss, opacity, translateX, width],
  );

  useEffect(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        damping: 18,
        stiffness: 180,
        mass: 0.8,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();

    dismissTimer.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);

    return () => {
      clearDismissTimer();
      translateX.stopAnimation();
      translateY.stopAnimation();
      opacity.stopAnimation();
    };
  }, [clearDismissTimer, dismiss, opacity, translateX, translateY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 6 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderGrant: () => {
        clearDismissTimer();
      },
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        const passedThreshold =
          Math.abs(gesture.dx) > width * SWIPE_DISTANCE_RATIO ||
          Math.abs(gesture.vx) > SWIPE_VELOCITY;

        if (passedThreshold) {
          dismiss(gesture.dx >= 0 ? 1 : -1);
          return;
        }

        Animated.spring(translateX, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }).start();
        dismissTimer.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          damping: 18,
          stiffness: 180,
          mass: 0.8,
          useNativeDriver: true,
        }).start();
        dismissTimer.current = setTimeout(() => dismiss(), AUTO_DISMISS_MS);
      },
    }),
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.card,
        {
          top: insets.top + 10,
          opacity,
          transform: [{ translateX }, { translateY }],
        },
      ]}
    >
      <Pressable
        style={styles.action}
        onPress={() => {
          onPress(data);
          dismiss();
        }}
        accessibilityRole="button"
        accessibilityLabel={t('ui.common.openNotification', { title })}
      >
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>🔔</Text>
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>
              {title}
            </Text>
            {timestampLabel ? (
              <Text style={styles.timestamp}>{timestampLabel}</Text>
            ) : null}
          </View>
          <Text style={styles.message} numberOfLines={2}>
            {message}
          </Text>
        </View>
      </Pressable>
      <Pressable
        style={styles.close}
        onPress={() => dismiss()}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={t('ui.common.dismissNotification')}
      >
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['theme']['colors']) =>
  StyleSheet.create({
    card: {
      position: 'absolute',
      left: 12,
      right: 12,
      minHeight: 72,
      zIndex: 100,
      elevation: 10,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 12,
      paddingRight: 8,
      shadowColor: colors.black,
      shadowOpacity: 0.2,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
    },
    action: {
      flex: 1,
      minHeight: 70,
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconCircle: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.cyan50,
      marginRight: 10,
    },
    icon: { fontSize: 18 },
    copy: { flex: 1, minWidth: 0 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 3,
    },
    title: {
      flex: 1,
      color: colors.text,
      fontFamily: 'PlusJakartaSans-Bold',
      fontSize: 13,
    },
    timestamp: {
      color: colors.secondaryText,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 10,
      marginLeft: 8,
    },
    message: {
      color: colors.secondaryText,
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 12,
      lineHeight: 17,
    },
    close: {
      width: 32,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeText: {
      color: colors.secondaryText,
      fontSize: 24,
      lineHeight: 26,
    },
  });

export default InAppNotification;

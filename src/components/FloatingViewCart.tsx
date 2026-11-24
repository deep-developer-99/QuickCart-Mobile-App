import { AppText as Text } from './AppText';
import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { RootState } from '../store/store';
import { radius, spacing, typography, useTheme } from '../theme';
import { navigationRef } from '../navigation/RootNavigator';

const subscribeToNavigation = (notify: () => void) => {
  const unsubscribeState = navigationRef.addListener('state', notify);
  const unsubscribeReady = navigationRef.addListener('ready', notify);
  return () => { unsubscribeState(); unsubscribeReady(); };
};
const currentScreen = () => navigationRef.getCurrentRoute()?.name;

const FloatingViewCart = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { items, hydratedForUserId } = useSelector((state: RootState) => state.cart);
  const userId = useSelector((state: RootState) => state.auth.user?.id ?? null);
  const activeRouteName = useSyncExternalStore(subscribeToNavigation, currentScreen);
  const visible = Boolean(activeRouteName) && activeRouteName !== 'Checkout' && activeRouteName !== 'Cart' && Boolean(userId) && hydratedForUserId === userId && items.length > 0;
  const quantity = items.reduce((total, item) => total + item.quantity, 0);
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(progress, { toValue: visible ? 1 : 0, useNativeDriver: true, damping: 18, stiffness: 180 }).start();
  }, [progress, visible]);

  const onPress = () => {
    if (!navigationRef.isReady()) return;
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (currentRoute === 'Checkout' || currentRoute === 'Cart') return;
    navigationRef.navigate('Cart');
  };

  return (
    <Animated.View pointerEvents={visible ? 'box-none' : 'none'} style={[styles.position, { bottom: insets.bottom + 66, opacity: progress, transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }, { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) }] }]}>
      <Pressable style={styles.pill} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${t('ui.common.viewCart')}, ${quantity}`}>
        <View style={styles.thumbnails}>
          {items.slice(0, 3).map((item, index) => <View key={`${item.product._id}:${item.variantId}`} style={[styles.thumbnail, index > 0 && styles.thumbnailOverlap, { zIndex: 3 - index }]}>{item.product.image ? <Image source={{ uri: item.product.image }} style={styles.image} resizeMode="contain" /> : <Text style={styles.fallback}>🛍</Text>}</View>)}
        </View>
        <View style={styles.copy}><Text style={styles.title}>{t('ui.common.viewCart')}</Text><Text style={styles.count}>{quantity} {t('ui.common.items')}</Text></View>
        <Text style={styles.chevron}>›</Text>
      </Pressable>
    </Animated.View>
  );
};

const createStyles = (colors: ReturnType<typeof useTheme>['theme']['colors']) => StyleSheet.create({
  position: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  pill: { width: '64%', minHeight: 56, borderRadius: radius.pill, backgroundColor: '#168B43', flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, elevation: 8, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  thumbnails: { flexDirection: 'row', alignItems: 'center' },
  thumbnail: { width: 36, height: 36, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 2, borderColor: '#168B43', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbnailOverlap: { marginLeft: -12 },
  image: { width: '100%', height: '100%' },
  fallback: { fontSize: 16 },
  copy: { flex: 1, marginLeft: spacing.sm, minWidth: 0 },
  title: { ...typography.body2Medium, color: colors.white },
  count: { ...typography.captionRegular, color: colors.white },
  chevron: { color: colors.white, fontSize: 28, lineHeight: 30 },
});

const useStyles = () => { const { theme } = useTheme(); return React.useMemo(() => createStyles(theme.colors), [theme.colors]); };

export default FloatingViewCart;

import { AppText as Text } from '../../components/AppText';
const profileImage = require('../../assets/icons/user.png');
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AccessibilityInfo,
  AppState,
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Alert,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useIsFocused, useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import {
  useGetSearchSuggestionsQuery,
  useGetMobileBannersQuery,
  useGetCategoriesQuery,
  useGetMobileCategoryNavigationQuery,
  useGetSubcategoriesQuery,
  useGetProductsQuery,
} from '../../api/quickCartApi';
import { hasVariantDiscount, lowestPricedVariant, variantDiscountPercentage, variantSellingPrice } from '../../utils/variantPricing';
import type { MobileBanner } from '../../api/quickCartApi';
import HomeCategoryNavigation from '../../components/HomeCategoryNavigation';
import CartAddedToast from '../../components/CartAddedToast';
import CartQuantityControl from '../../components/CartQuantityControl';
import WishlistHeartButton from '../../components/WishlistHeartButton';
import type { CartProduct } from '../../store/slices/cartSlice';
import type { RootState } from '../../store/store';
import { radius, spacing, typography, useTheme } from '../../theme';
import type { ThemeColors } from '../../theme';
import {
  getCurrentLocation,
  requestLocationPermission,
  reverseGeocodeCoordinates,
} from '../../services/locationService';
import {
  hasPushNotificationPermission,
  requestPushNotificationPermission,
} from '../../services/pushNotifications';

interface Category {
  _id: string;
  name: string;
  image?: string;
}

interface Product extends CartProduct {
  category?: string | { _id: string; name: string };
}

const categoryEmoji: Record<string, string> = {
  electronics: '📱',
  fashion: '👜',
  furniture: '🛋️',
  industrial: '🚗',
  'home decor': '🎁',
  health: '🩺',
  'construction & real estate': '🏠',
  'fabrication service': '📏',
  'electrical equipment': '🔌',
};

const productEmoji = (name: string) => {
  const value = name.toLowerCase();
  if (value.includes('watch')) return '⌚';
  if (value.includes('headphone')) return '🎧';
  if (value.includes('phone')) return '📱';
  if (value.includes('laptop')) return '💻';
  if (value.includes('shoe')) return '👟';
  if (value.includes('glass')) return '👓';
  return '🛍️';
};

const NOTIFICATION_PROMPT_SEEN_KEY =
  'quickcart.notificationPermissionPromptSeen';

const hintLayout = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  slot: { flex: 1, height: 22, overflow: 'hidden' },
  measure: { position: 'absolute', opacity: 0 },
  clip: { height: 22, overflow: 'hidden' },
  text: { width: 1000 },
});

function RotatingHint({
  phrases, interval, typingSpeed, deletingSpeed,
}: {
  phrases: string[];
  interval: number;
  typingSpeed: number;
  deletingSpeed: number;
}) {
  const styles = useStyles();
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [reducedMotion, setReducedMotion] = useState(true);
  const [index, setIndex] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const indexRef = useRef(0);
  const progress = useRef(new Animated.Value(1)).current;
  const measured = widths.length >= phrases.length &&
    phrases.every((_, position) => (widths[position] ?? 0) > 0);
  const currentWidth = widths[index] ?? 0;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (mounted) setReducedMotion(value);
    }).catch(() => setReducedMotion(true));
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReducedMotion);
    const app = AppState.addEventListener('change', state => setForeground(state === 'active'));
    return () => { mounted = false; motion.remove(); app.remove(); };
  }, []);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame: number | undefined;
    let animation: Animated.CompositeAnimation | undefined;
    const resetVisible = () => {
      progress.stopAnimation();
      progress.setValue(1);
    };
    if (!focused || !foreground || reducedMotion || phrases.length < 2 || !measured) {
      resetVisible();
      return;
    }

    const hold = () => {
      timer = setTimeout(erase, interval);
    };
    const erase = () => {
      if (!active) return;
      animation = Animated.timing(progress, {
        toValue: 0,
        duration: (Array.from(phrases[indexRef.current]).length + 1) * deletingSpeed,
        easing: Easing.linear,
        useNativeDriver: false,
      });
      animation.start(({ finished }) => {
        if (!active) return;
        if (!finished) { resetVisible(); return; }
        const next = (indexRef.current + 1) % phrases.length;
        indexRef.current = next;
        setIndex(next);
        // The next measured phrase must commit before its width interpolation runs.
        frame = requestAnimationFrame(() => {
          if (!active) return;
          progress.setValue(0);
          animation = Animated.timing(progress, {
            toValue: 1,
            duration: (Array.from(phrases[next]).length + 1) * typingSpeed,
            easing: Easing.linear,
            useNativeDriver: false,
          });
          animation.start(result => {
            if (!active) return;
            if (result.finished) hold();
            else resetVisible();
          });
        });
      });
    };
    resetVisible();
    hold();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
      if (frame !== undefined) cancelAnimationFrame(frame);
      animation?.stop();
      resetVisible();
    };
  }, [focused, foreground, reducedMotion, measured, phrases, interval,
    typingSpeed, deletingSpeed, progress]);

  const onMeasure = (position: number, value: number) => {
    if (!Number.isFinite(value) || value <= 0) return;
    setWidths(previous => {
      if (previous[position] === value) return previous;
      const next = [...previous];
      next[position] = value;
      return next;
    });
  };

  return (
    <View style={hintLayout.row}>
      <Text style={styles.searchPlaceholder}>{'Search for "'}</Text>
      <View style={hintLayout.slot}>
        {phrases.map((value, position) => (
          <Text key={position} style={[styles.searchPlaceholder, hintLayout.measure]}
            onLayout={event => onMeasure(position, event.nativeEvent.layout.width)}>
            {value + '"'}
          </Text>
        ))}
        {measured && !reducedMotion && phrases.length > 1 ? (
          <Animated.View pointerEvents="none" style={[hintLayout.clip, {
            width: progress.interpolate({
              inputRange: [0, 1], outputRange: [0, currentWidth],
              extrapolate: 'clamp',
            }),
          }]}>
            <Text style={[styles.searchPlaceholder, hintLayout.text]} numberOfLines={1}>
              {phrases[index] + '"'}
            </Text>
          </Animated.View>
        ) : (
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            {phrases[index] + '"'}
          </Text>
        )}
      </View>
    </View>
  );
}

const SearchHint = () => {
  const styles = useStyles();
  const { data } = useGetSearchSuggestionsQuery(undefined, { refetchOnMountOrArgChange: 30 });
  const config = data?.data;
  const phrases = useMemo(() => {
    if (!config?.isEnabled || !Array.isArray(config.suggestions)) return [];
    const seen = new Set<string>();
    return config.suggestions.flatMap(entry => {
      if (typeof entry?.phrase !== 'string' || ('isActive' in entry && entry.isActive === false)) return [];
      const phrase = entry.phrase.trim().replace(/^(?:search\s+for(?:\s+|$))+/i, '')
        .replace(/^[\s"'“”‘’]+|[\s"'“”‘’]+$/g, '').trim();
      const key = phrase.normalize('NFC').toLowerCase();
      if (!key || /^(undefined|null|ui\.[\w.]+)$/.test(key) || seen.has(key)) return [];
      seen.add(key);
      return [phrase];
    });
  }, [config]);
  if (!phrases.length) return <Text style={styles.searchPlaceholder}>Search for products</Text>;
  const interval = config?.rotationInterval ?? 2500;
  const speed = (value: number | undefined, fallback: number) =>
    Number.isInteger(value) && value! >= 20 && value! <= 150 ? value! : fallback;
  return <RotatingHint key={JSON.stringify(phrases)} phrases={phrases}
    interval={Number.isInteger(interval) && interval >= 1000 && interval <= 10000 ? interval : 2500}
    typingSpeed={speed(config?.typingSpeedMs, 60)}
    deletingSpeed={speed(config?.deletingSpeedMs, 40)} />;
};

const HomeScreen = () => {
  const styles = useStyles();
  const navigation = useNavigation<any>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [currentLocation, setCurrentLocation] = useState<string | null>(null);
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [
    requestingNotificationPermission,
    setRequestingNotificationPermission,
  ] = useState(false);
  const notificationPromptDismissed = useRef(false);
  const [locationUnavailable, setLocationUnavailable] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [showCartToast, setShowCartToast] = useState(false);
  const hasRequestedInitialLocation = useRef(false);
  const cartToastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const detectCurrentLocation = useCallback(async () => {
    if (isLocating) return;
    setIsLocating(true);

    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        setIsLocating(false);
        Alert.alert(t('home.permissionTitle'), t('home.permissionMessage'));
        return;
      }

      const coordinates = await getCurrentLocation();
      try {
        const label = await reverseGeocodeCoordinates(
          coordinates.latitude,
          coordinates.longitude,
        );
        setLocationUnavailable(false);
        setCurrentLocation(label || null);
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
        setLocationUnavailable(true);
      } finally {
        setIsLocating(false);
      }
    } catch (error) {
      setIsLocating(false);
      console.error('Location permission request failed:', error);
      Alert.alert(t('home.locationError'), t('home.locationErrorMessage'));
    }
  }, [isLocating, t]);

  useEffect(() => {
    let active = true;

    const checkNotificationPermission = async () => {
      try {
        const promptSeen = await AsyncStorage.getItem(
          NOTIFICATION_PROMPT_SEEN_KEY,
        );

        if (
          !active ||
          promptSeen === 'true' ||
          notificationPromptDismissed.current
        ) {
          return;
        }

        const permissionGranted = await hasPushNotificationPermission();

        if (!active) return;

        if (permissionGranted) {
          await AsyncStorage.setItem(NOTIFICATION_PROMPT_SEEN_KEY, 'true');
          return;
        }

        setShowNotificationPrompt(true);
      } catch (error) {
        console.warn('Failed to check notification permission:', error);
      }
    };

    checkNotificationPermission();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (hasRequestedInitialLocation.current) return;

    hasRequestedInitialLocation.current = true;
    detectCurrentLocation();
  }, [detectCurrentLocation]);

  const cartLoading = useSelector((state: RootState) => Boolean(state.auth.user?.id && state.cart.hydratedForUserId !== state.auth.user.id));
  const showAddedToast = useCallback(() => {
    setShowCartToast(true);
    if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    cartToastTimeout.current = setTimeout(() => setShowCartToast(false), 2800);
  }, []);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<string | null>(null);
  const selectHomeCategory = useCallback((categoryId: string | null) => {
    setSelectedCategoryId(categoryId);
    setSelectedSubcategoryId(null);
  }, []);

  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isFetching: categoriesFetching,
    refetch: refetchCategories,
  } = useGetCategoriesQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const {
    data: productResponse,
    isLoading: productsLoading,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useGetProductsQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const {
    data: bannerResponse,
    isFetching: bannersFetching,
    refetch: refetchBanners,
  } = useGetMobileBannersQuery(undefined, {
    refetchOnMountOrArgChange: 30,
  });
  const { data: navigationResponse, refetch: refetchNavigation } = useGetMobileCategoryNavigationQuery(undefined, { refetchOnMountOrArgChange: 30 });
  const navigationItems = useMemo(() => Array.isArray(navigationResponse?.data) ? navigationResponse.data : [], [navigationResponse]);
  useEffect(() => {
    if (navigationResponse && selectedCategoryId && !navigationItems.some(item => item.categoryId === selectedCategoryId)) selectHomeCategory(null);
  }, [navigationItems, navigationResponse, selectedCategoryId, selectHomeCategory]);
  const selectedNavigationItem = navigationItems.find(item => item.categoryId === selectedCategoryId);
  const { currentData: selectedSubcategories, isFetching: selectedSubcategoriesLoading, refetch: refetchSelectedSubcategories } = useGetSubcategoriesQuery(selectedCategoryId ?? '', { skip: !selectedCategoryId });
  const { data: selectedProducts, isFetching: selectedProductsLoading, refetch: refetchSelectedProducts } = useGetProductsQuery({ category: selectedCategoryId ?? undefined, subCategory: selectedSubcategoryId ?? undefined, page: 1, limit: 18 }, { skip: !selectedCategoryId });
  useEffect(() => {
    if (selectedSubcategoryId && selectedSubcategories && !selectedSubcategories.data.some(item => item._id === selectedSubcategoryId)) setSelectedSubcategoryId(null);
  }, [selectedSubcategoryId, selectedSubcategories]);

  const banners = useMemo<MobileBanner[]>(() =>
    Array.isArray(bannerResponse?.data) ? bannerResponse.data.filter(banner => Boolean(banner.image?.trim())) : [],
  [bannerResponse]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [invalidBannerIds, setInvalidBannerIds] = useState<Set<string>>(
    () => new Set(),
  );
  const bannerScrollRef = useRef<any>(null);
  const bannerRatioCache = useRef<Record<string, number>>({});
  const { width: screenWidth } = useWindowDimensions();
  const bannerWidth = Math.max(screenWidth, 1);
  const [bannerRatios, setBannerRatios] = useState<Record<string, number>>({});
  const activeBanner = banners[bannerIndex];
  useEffect(() => {
    let active = true;
    banners.forEach(banner => {
      if (bannerRatioCache.current[banner.image]) return;
      Image.getSize(banner.image, (width, height) => {
        if (active && width > 0 && height > 0) {
          const ratio = width / height;
          bannerRatioCache.current[banner.image] = ratio;
          setBannerRatios(current => current[banner.image] === ratio ? current : { ...current, [banner.image]: ratio });
        }
      }, () => undefined);
    });
    return () => { active = false; };
  }, [banners]);
  const bannerRatio = activeBanner ? bannerRatios[activeBanner.image] ?? 2.1 : 2.1;
  const bannerHeight = Math.round(Math.min(bannerWidth, bannerWidth / Math.max(bannerRatio, 1)));
  const [bannerAnimatedHeight] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const animation = Animated.timing(bannerAnimatedHeight, {
      toValue: banners.length ? bannerHeight : 0,
      duration: 240,
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [bannerAnimatedHeight, bannerHeight, banners.length]);

  const categories = useMemo<Category[]>(
    () => (Array.isArray(categoryResponse?.data) ? categoryResponse.data : []),
    [categoryResponse],
  );
  const products = useMemo<Product[]>(
    () =>
      Array.isArray((selectedCategoryId ? selectedProducts : productResponse)?.data)
        ? (selectedCategoryId ? selectedProducts : productResponse)!.data.slice(0, 18)
        : [],
    [productResponse, selectedCategoryId, selectedProducts],
  );
  const productCardWidth = Math.max(
    1,
    (screenWidth - spacing.lg * 2 - spacing.sm * 2) / 3,
  );

  const isRefreshing =
    categoriesFetching || productsFetching || bannersFetching || selectedSubcategoriesLoading || selectedProductsLoading;

  const refreshHome = useCallback(async () => {
    await Promise.all([
      refetchCategories(),
      refetchProducts(),
      refetchBanners(),
      refetchNavigation(),
      ...(selectedCategoryId ? [refetchSelectedSubcategories(), refetchSelectedProducts()] : []),
    ]);
  }, [refetchBanners, refetchCategories, refetchProducts, refetchNavigation, refetchSelectedSubcategories, refetchSelectedProducts, selectedCategoryId]);

  const bannerKey = banners.map(banner => `${banner._id}:${banner.image}`).join('|');

  useEffect(() => {
    setBannerIndex(0);
    setInvalidBannerIds(new Set());
    bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [bannerKey]);

  useEffect(
    () => () => {
      if (cartToastTimeout.current) clearTimeout(cartToastTimeout.current);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (banners.length <= 1) return undefined;

      const interval = setInterval(() => {
        setBannerIndex(current => {
          const next = (current + 1) % banners.length;
          bannerScrollRef.current?.scrollTo({
            x: next * bannerWidth,
            animated: true,
          });
          return next;
        });
      }, 4000);

      return () => clearInterval(interval);
    }, [bannerWidth, banners.length]),
  );

  const handleBannerPress = useCallback(
    (banner: MobileBanner) => {
      const type = banner.redirectType;
      const value = banner.redirectTarget;
      if (!value) return;
      if (type === 'category') {
        navigation.navigate('Categories', { categoryId: value });
        return;
      }
      if (type === 'subcategory' && banner.redirectCategoryId) {
        selectHomeCategory(banner.redirectCategoryId);
        setSelectedSubcategoryId(value);
        return;
      }
      if (type === 'product') {
        navigation.navigate('ProductDetails', { productId: value });
      }
    },
    [navigation, selectHomeCategory],
  );

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        refreshHome().catch(error => {
          console.error('Failed to refresh home:', error);
        });
      }, 30_000);

      return () => clearInterval(interval);
    }, [refreshHome]),
  );

  const handleAllowNotifications = async () => {
    if (requestingNotificationPermission) return;

    setRequestingNotificationPermission(true);

    try {
      await requestPushNotificationPermission();

      // Do not repeatedly interrupt the user after they respond to the system prompt.
      await AsyncStorage.setItem(NOTIFICATION_PROMPT_SEEN_KEY, 'true');
      notificationPromptDismissed.current = true;
      setShowNotificationPrompt(false);
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
      Alert.alert(
        'Notification Permission',
        'Unable to request notification permission. Please try again.',
      );
    } finally {
      setRequestingNotificationPermission(false);
    }
  };

  const handleLaterNotifications = async () => {
    notificationPromptDismissed.current = true;
    setShowNotificationPrompt(false);

    try {
      await AsyncStorage.setItem(NOTIFICATION_PROMPT_SEEN_KEY, 'true');
    } catch (error) {
      console.warn('Failed to save notification prompt choice:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.page}>
      <ScrollView
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 104) }}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshHome}
            tintColor={styles.refreshControl.color}
            colors={[styles.refreshControl.color]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.locationHeading}>
              <Text style={styles.locationHeadline}>QuickCart</Text>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('tabs.profile')}
                style={styles.avatar}
                onPress={() => navigation.navigate('Profile')}
                hitSlop={8}
              >
                <Image source={profileImage} resizeMode="contain" style={styles.profileImage} />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={styles.locationRow}
            onPress={detectCurrentLocation}
            disabled={isLocating}
            accessibilityRole="button"
            accessibilityLabel={t('home.detectLocation')}
            hitSlop={8}
          >
            <Text style={styles.locationPin}>📍</Text>
            <View style={styles.locationCopy}>
              <Text style={styles.locationText}>{t('home.deliverTo')}</Text>
              <Text style={styles.locationStrong} numberOfLines={1}>
                {isLocating
                  ? t('home.detectingLocation')
                  : locationUnavailable
                  ? t('home.locationUnavailable')
                  : currentLocation || t('home.currentLocation')}
              </Text>
            </View>
            {isLocating ? (
              <ActivityIndicator
                size="small"
                color={styles.locationSpinner.color}
              />
            ) : null}
            <Text style={styles.locationChevron}>⌄</Text>
          </Pressable>
        </View>

        <View style={styles.stickySearch}>
          <Pressable style={styles.searchField} onPress={() => navigation.navigate('Search')} accessibilityRole="button" accessibilityLabel={t('ui.common.searchPlaceholder')}>
            <View style={styles.searchIcon}><View style={styles.searchHandle} /></View>
            <SearchHint />
          </Pressable>
          <HomeCategoryNavigation items={navigationItems} selectedId={selectedCategoryId} onSelect={selectHomeCategory} />
        </View>

        {selectedCategoryId ? null : banners.length > 0 ? (
          <Animated.View
            style={[
              styles.bannerCarousel,
              { width: bannerWidth, height: bannerAnimatedHeight },
            ]}
          >
            <ScrollView
              ref={bannerScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              onMomentumScrollEnd={event => {
                const nextIndex = Math.round(
                  event.nativeEvent.contentOffset.x / bannerWidth,
                );
                setBannerIndex(
                  Math.max(0, Math.min(nextIndex, banners.length - 1)),
                );
              }}
            >
              {banners.map(banner => {
                const imageFailed = invalidBannerIds.has(banner._id);

                return (
                  <Pressable
                    key={banner._id}
                    style={{ width: bannerWidth, height: bannerHeight }}
                    onPress={() => handleBannerPress(banner)}
                    disabled={banner.redirectType === 'none' || !banner.redirectTarget}
                  >
                    {!imageFailed ? (
                      <Image
                        source={{ uri: banner.image }}
                        style={styles.bannerImage}
                        resizeMode="contain"
                        onError={() => setInvalidBannerIds(current => new Set(current).add(banner._id))}
                      />
                    ) : (
                      <View style={styles.bannerFallback}><Text style={styles.bannerFallbackTitle}>{banner.title}</Text></View>
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>

            {banners.length > 1 ? (
              <View style={styles.bannerDots}>
                {banners.map((banner, index) => (
                  <View
                    key={banner._id}
                    style={
                      index === bannerIndex ? styles.activeDot : styles.dot
                    }
                  />
                ))}
              </View>
            ) : null}
          </Animated.View>
        ) : null}

        {selectedCategoryId ? <View style={styles.section}>
          <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{selectedNavigationItem?.name ?? 'Subcategories'}</Text></View>
          {selectedSubcategoriesLoading ? <ActivityIndicator color={styles.loadingIndicator.color} /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
            {(selectedSubcategories?.data ?? []).map(subcategory => <Pressable key={subcategory._id} style={styles.categoryCard} onPress={() => setSelectedSubcategoryId(current => current === subcategory._id ? null : subcategory._id)} accessibilityState={{ selected: selectedSubcategoryId === subcategory._id }}>
              <View style={styles.categoryIcon}>{subcategory.image ? <Image source={{ uri: subcategory.image }} style={styles.categoryImage} resizeMode="contain" /> : <Text style={styles.categoryEmoji}>🛍️</Text>}</View>
              <Text style={[styles.categoryName, selectedSubcategoryId === subcategory._id && styles.selectedCategoryName]} numberOfLines={1}>{subcategory.name}</Text>
            </Pressable>)}
          </ScrollView>}
        </View> : <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('tabs.categories')}</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </Pressable>
          </View>

          {categoriesLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="small"
                color={styles.loadingIndicator.color}
              />
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
            >
              {categories.map(category => (
                <Pressable
                  key={category._id}
                  style={styles.categoryCard}
                  onPress={() =>
                    navigation.navigate('Categories', {
                      categoryId: category._id,
                    })
                  }
                >
                  <View style={styles.categoryIcon}>
                    {category.image ? (
                      <Image
                        source={{ uri: category.image }}
                        style={styles.categoryImage}
                        resizeMode="contain"
                      />
                    ) : (
                      <Text style={styles.categoryEmoji}>
                        {categoryEmoji[category.name.toLowerCase()] ?? '🛍️'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {category.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{selectedCategoryId ? `${selectedNavigationItem?.name ?? 'Category'} Products` : t('home.latestProducts')}</Text>
            <Pressable onPress={() => navigation.navigate('Categories')}>
              <Text style={styles.seeAll}>{t('home.seeAll')}</Text>
            </Pressable>
          </View>

          {(selectedCategoryId ? selectedProductsLoading : productsLoading) ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator
                size="small"
                color={styles.loadingIndicator.color}
              />
            </View>
          ) : (
            <View style={[styles.productGrid, { columnGap: spacing.sm }]}>
              {selectedCategoryId && products.length === 0 ? <Text style={styles.emptyCategoryProducts}>No products available in this category.</Text> : null}
              {products.map(product => {
                const cardVariant = lowestPricedVariant(product.variants);
                const sellingPrice = variantSellingPrice(cardVariant);

                return (
                  <View key={product._id} style={[styles.productCard, { width: productCardWidth }]}>
                    <View style={styles.productImageContainer}>
                      <Pressable
                        style={styles.productImagePressable}
                        onPress={() => navigation.navigate('ProductDetails', { product })}
                        accessibilityRole="button"
                        accessibilityLabel={`View ${product.name}`}
                      >
                        {product.image ? (
                          <Image
                            source={{ uri: product.image }}
                            style={styles.productImage}
                            resizeMode="contain"
                          />
                        ) : (
                          <View style={styles.productFallback}>
                            <Text style={styles.productFallbackEmoji}>
                              {productEmoji(product.name)}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                      <WishlistHeartButton
                        product={product}
                        buttonStyle={styles.heartButton}
                        heartStyle={styles.heartText}
                        addLabel={t('ui.product.addToWishlist', { name: product.name })}
                        removeLabel={t('ui.common.removeFromWishlist', { name: product.name })}
                      />
                    </View>
                    <View style={styles.cartControl}>
                      <CartQuantityControl
                          productId={product._id}
                          productName={product.name}
                          productImage={product.image}
                          stock={cardVariant?.stock}
                          variants={product.variants}
                          disabled={cartLoading}
                          compact
                          onAdded={showAddedToast}
                      />
                    </View>
                    <Pressable
                      onPress={() => navigation.navigate('ProductDetails', { product })}
                      accessibilityRole="button"
                      accessibilityLabel={`View ${product.name}`}
                    >
                      <Text style={styles.productName} numberOfLines={3}>
                        {product.name}
                      </Text>
                      <Text style={styles.productUnit} numberOfLines={1}>
                        {cardVariant ? `${cardVariant.quantity} ${cardVariant.unit}` : ' '}
                      </Text>
                      <Text style={styles.productPrice} numberOfLines={1}>
                        {cardVariant ? `₹${sellingPrice.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : ' '}
                      </Text>
                      <View style={styles.discountRow}>
                        {hasVariantDiscount(cardVariant) ? <><Text style={styles.originalPrice} numberOfLines={1}>₹{cardVariant.price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</Text><Text style={styles.productDiscount}>{variantDiscountPercentage(cardVariant)}% OFF on MRP</Text></> : null}
                      </View>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.deliveryPromise}>
          <View style={styles.deliveryPromiseIcon}>
            <Text style={styles.deliveryPromiseIconText}>⚡</Text>
          </View>
          <Text style={styles.deliveryPromiseText}>
            {t('home.deliveryTagline')}
          </Text>
          <View style={styles.deliveryPromiseAccent} />
        </View>
      </ScrollView>
      </View>
      <CartAddedToast
        visible={showCartToast}
        onViewCart={() => navigation.navigate('Checkout')}
      />

      <Modal
        visible={showNotificationPrompt}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleLaterNotifications}
      >
        <View style={styles.notificationModalBackdrop}>
          <View style={styles.notificationModalCard}>
            <View style={styles.notificationBellCircle}>
              <Text style={styles.notificationBell}>🔔</Text>
            </View>

            <Text style={styles.notificationModalTitle}>
              Stay Updated with QuickCart
            </Text>

            <Text style={styles.notificationModalMessage}>
              Get updates about your orders, delivery status, and special
              offers. Enable notifications so you never miss an important
              update.
            </Text>

            <Pressable
              style={styles.notificationAllowButton}
              onPress={handleAllowNotifications}
              disabled={requestingNotificationPermission}
              accessibilityRole="button"
            >
              {requestingNotificationPermission ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.notificationAllowText}>
                  Allow Notifications
                </Text>
              )}
            </Pressable>

            <Pressable
              style={styles.notificationLaterButton}
              onPress={handleLaterNotifications}
              disabled={requestingNotificationPermission}
              accessibilityRole="button"
            >
              <Text style={styles.notificationLaterText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

type ThemeMode = 'light' | 'dark';

const createStyles = (colors: ThemeColors, _mode: ThemeMode) => ({
  container: { flex: 1, backgroundColor: colors.background },
  page: { flex: 1 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  stickySearch: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, backgroundColor: colors.background, zIndex: 3 },
  searchField: { height: 48, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, flexDirection: 'row' as const, alignItems: 'center' as const, paddingHorizontal: spacing.md, gap: spacing.md },
  searchPlaceholder: { ...typography.body2Regular, color: colors.secondaryText },
  headerTop: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  locationHeading: { flex: 1, minWidth: 0 },
  locationHeadline: { ...typography.heading3Bold, color: colors.text, fontSize: 18 },
  locationSubheading: { ...typography.captionRegular, color: colors.secondaryText },
  headerActions: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: spacing.md,
  },
  searchIcon: {
    width: 25,
    height: 25,
    borderWidth: 2,
    borderColor: colors.secondaryText,
    borderRadius: radius.pill,
    position: 'relative' as const,
  },
  searchHandle: {
    position: 'absolute' as const,
    width: 9,
    height: 2,
    backgroundColor: colors.text,
    right: -6,
    bottom: 0,
    transform: [{ rotate: '48deg' }],
    borderRadius: radius.pill,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.grey50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  profileImage: { width: 28, height: 28 },
  locationRow: {
    marginTop: spacing.md,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  locationPin: { fontSize: 15, marginRight: spacing.xs },
  locationCopy: { flex: 1, minWidth: 0 },
  locationText: { ...typography.captionRegular, color: colors.secondaryText },
  locationStrong: { ...typography.captionSemiBold, color: colors.text },
  locationChevron: { fontSize: 21, color: colors.text, marginLeft: spacing.sm },
  locationSpinner: { color: colors.cyan },
  refreshControl: { color: colors.cyan },
  loadingIndicator: { color: colors.cyan },
  bannerCarousel: {
    overflow: 'hidden' as const,
    position: 'relative' as const,
    backgroundColor: colors.grey50,
  },
  bannerImage: { width: '100%', height: '100%' },
  bannerFallback: {
    flex: 1,
    backgroundColor: colors.grey50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  bannerFallbackTitle: { ...typography.body2Regular, color: colors.secondaryText },
  bannerDots: {
    position: 'absolute' as const,
    alignSelf: 'center' as const,
    bottom: spacing.md,
    flexDirection: 'row' as const,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan,
    marginHorizontal: 2,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.grey100,
    marginHorizontal: 2,
  },
  section: { marginTop: spacing.xxl },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.heading3Bold, color: colors.text },
  seeAll: { ...typography.captionSemiBold, color: colors.cyan },
  categoryList: { paddingHorizontal: spacing.lg },
  categoryCard: {
    width: 76,
    height: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginRight: spacing.sm,
  },
  categoryIcon: {
    width: 36,
    height: 36,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  categoryEmoji: { fontSize: 27 },
  categoryImage: { width: 32, height: 32 },
  categoryName: {
    ...typography.overlineRegular,
    color: colors.text,
    fontSize: 9,
    textAlign: 'center' as const,
  },
  selectedCategoryName: { fontWeight: '700' as const, color: colors.cyan },
  productGrid: {
    paddingHorizontal: spacing.lg,
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'flex-start' as const,
  },
  emptyCategoryProducts: { ...typography.body2Regular, color: colors.secondaryText, paddingVertical: spacing.lg },
  productCard: {
    minWidth: 0,
    marginBottom: spacing.lg,
  },
  productImageContainer: {
    aspectRatio: 0.92,
    borderRadius: radius.xl,
    overflow: 'hidden' as const,
    backgroundColor: colors.grey50,
    position: 'relative' as const,
  },
  productImagePressable: { flex: 1 },
  productImage: { width: '100%', height: '100%', borderRadius: radius.xl },
  productFallback: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  productFallbackEmoji: { fontSize: 56 },
  heartButton: {
    position: 'absolute' as const,
    top: 7,
    right: 7,
    width: 27,
    height: 27,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  heartText: {
    color: colors.red,
    fontSize: 17,
    lineHeight: 18,
  },
  productName: {
    ...typography.captionRegular,
    color: colors.text,
    marginTop: spacing.sm,
    minHeight: 36,
    lineHeight: 14,
    flexShrink: 1,
  },
  productPrice: { ...typography.body2Medium, color: colors.text, minHeight: 19, fontSize: 14 },
  productUnit: { ...typography.captionRegular, color: colors.secondaryText, minHeight: 15, fontSize: 10 },
  originalPrice: {
    ...typography.captionRegular,
    color: colors.secondaryText,
    textDecorationLine: 'line-through' as const,
    flexShrink: 1,
  },
  discountRow: { minHeight: 16, flexDirection: 'row' as const, alignItems: 'center' as const, gap: 4 },
  productDiscount: { ...typography.captionRegular, color: '#168BCE', fontSize: 8, flexShrink: 1 },
  cartControl: {
    alignSelf: 'flex-end' as const,
    width: '56%' as const,
    minHeight: 38,
    justifyContent: 'flex-start' as const,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  loadingBox: {
    height: 100,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  deliveryPromise: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center' as const,
    overflow: 'hidden' as const,
  },
  deliveryPromiseIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    backgroundColor: colors.cyan50,
    marginBottom: spacing.md,
  },
  deliveryPromiseIconText: {
    fontSize: 22,
    color: colors.cyan,
  },
  deliveryPromiseText: {
    ...typography.heading2Bold,
    color: colors.cyan,
    textAlign: 'center' as const,
    lineHeight: 32,
  },
  deliveryPromiseAccent: {
    position: 'absolute' as const,
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    backgroundColor: colors.cyan,
  },
  notificationModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: spacing.xl,
  },
  notificationModalCard: {
    width: '100%' as const,
    maxWidth: 380,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notificationBellCircle: {
    width: 64,
    height: 64,
    borderRadius: radius.pill,
    backgroundColor: colors.cyan50,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: spacing.lg,
  },
  notificationBell: {
    fontSize: 28,
  },
  notificationModalTitle: {
    ...typography.heading3Bold,
    color: colors.text,
    textAlign: 'center' as const,
    marginBottom: spacing.sm,
  },
  notificationModalMessage: {
    ...typography.body2Regular,
    color: colors.secondaryText,
    textAlign: 'center' as const,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  notificationAllowButton: {
    width: '100%' as const,
    minHeight: 48,
    borderRadius: radius.md,
    backgroundColor: colors.cyan,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: spacing.lg,
  },
  notificationAllowText: {
    ...typography.body2Medium,
    color: colors.white,
  },
  notificationLaterButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xs,
  },
  notificationLaterText: {
    ...typography.body2Medium,
    color: colors.secondaryText,
  },
});

const useStyles = () => {
  const { theme, mode } = useTheme();
  return React.useMemo(
    () => createStyles(theme.colors, mode),
    [theme.colors, mode],
  );
};

export default HomeScreen;

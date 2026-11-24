import { useTheme } from '../theme';
import type { ThemeColors } from '../theme';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

import HomeScreen from '../screens/Home/HomeScreen';
import CategoriesScreen from '../screens/Categories/CategoriesScreen';
import WishlistScreen from '../screens/Wishlist/WishlistScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

import HomeIcon from '../assets/icons/home-2.svg';
import CategoriesIcon from '../assets/icons/category-2.svg';
import WishlistIcon from '../assets/icons/heart.svg';
import ProfileIcon from '../assets/icons/profile.svg';

import { useGetWishlistQuery } from '../api/quickCartApi';
import { selectHasWishlistItems } from '../store/slices/wishlistSlice';

export type MainTabParamList = {
  Home: undefined;
  Categories: { categoryId?: string } | undefined;
  Wishlist: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabBarIconProps = {
  color: string;
  routeName: keyof MainTabParamList;
};

const tabIcons = {
  Home: HomeIcon,
  Categories: CategoriesIcon,
  Wishlist: WishlistIcon,
  Profile: ProfileIcon,
};

const TabBarIcon = ({ color, routeName }: TabBarIconProps) => {
  const styles = useStyles();
  const hasWishlistItems = useSelector(selectHasWishlistItems);

  const Icon = tabIcons[routeName];

  return (
    <View style={styles.iconContainer}>
      <Icon width={24} height={24} color={color} fill={color} />


      {routeName === 'Wishlist' && hasWishlistItems ? (
        <View style={styles.wishlistBadge} />
      ) : null}
    </View>
  );
};

const renderHomeIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Home" />
);
const renderCategoriesIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Categories" />
);
const renderWishlistIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Wishlist" />
);
const renderProfileIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Profile" />
);

const MainTabNavigator = () => {
  const styles = useStyles();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  useGetWishlistQuery(undefined, { skip: !isAuthenticated });

  return (
    <Tab.Navigator
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.cyan,
        tabBarInactiveTintColor: theme.colors.grey150,
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: styles.tabItem,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 58 + insets.bottom,
            paddingBottom: 4 + insets.bottom,
          },
        ],
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: t('tabs.home'), tabBarIcon: renderHomeIcon }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarLabel: t('tabs.categories'),
          tabBarIcon: renderCategoriesIcon,
        }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarLabel: t('tabs.wishlist'),
          tabBarIcon: renderWishlistIcon,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tabs.profile'),
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
};

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    iconContainer: {
      width: 30,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cartBadge: {
      position: 'absolute',
      right: 1,
      top: 1,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.red,
      borderWidth: 1,
      borderColor: colors.white,
    },
    wishlistBadge: {
      position: 'absolute',
      right: 1,
      top: 1,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.red,
      borderWidth: 1,
      borderColor: colors.white,
    },
    tabItem: { flex: 1 },
    tabBarLabel: {
      fontFamily: 'PlusJakartaSans-Regular',
      fontSize: 10,
      textAlign: 'center',
    },
    tabBar: {
      height: 68,
      paddingTop: 5,
      paddingBottom: 7,
      borderTopWidth: 1,
      borderTopColor: colors.grey50,
      backgroundColor: colors.surface,
    },
  });

const useStyles = () => {
  const { theme } = useTheme();
  return React.useMemo(() => createStyles(theme.colors), [theme.colors]);
};

export default MainTabNavigator;

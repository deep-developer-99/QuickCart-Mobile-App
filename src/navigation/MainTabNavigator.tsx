import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import HomeScreen from '../screens/Home/HomeScreen';
import CategoriesScreen from '../screens/Categories/CategoriesScreen';
import CartScreen from '../screens/Cart/CartScreen';
import WishlistScreen from '../screens/Wishlist/WishlistScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

import HomeIcon from '../assets/icons/home-2.svg';
import CategoriesIcon from '../assets/icons/category-2.svg';
import CartIcon from '../assets/icons/shopping-cart.svg';
import WishlistIcon from '../assets/icons/heart.svg';
import ProfileIcon from '../assets/icons/profile.svg';

import {
  getWishlistProducts,
  useGetCartQuery,
  useGetWishlistQuery,
} from '../api/quickCartApi';

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Cart: undefined;
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
  Cart: CartIcon,
  Wishlist: WishlistIcon,
  Profile: ProfileIcon,
};

const TabBarIcon = ({ color, routeName }: TabBarIconProps) => {
  const { data: cartResponse } = useGetCartQuery();
  const { data: wishlistResponse } = useGetWishlistQuery();

  const cartCount =
    cartResponse?.data?.items?.reduce(
      (total, item) => total + item.quantity,
      0,
    ) ?? 0;

  const hasWishlistItems = getWishlistProducts(wishlistResponse).length > 0;
  const Icon = tabIcons[routeName];

  return (
    <View style={styles.iconContainer}>
      <Icon width={24} height={24} color={color} fill={color} />

      {routeName === 'Cart' && cartCount > 0 ? (
        <View style={styles.cartBadge} />
      ) : null}

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
const renderCartIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Cart" />
);
const renderWishlistIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Wishlist" />
);
const renderProfileIcon = ({ color }: { color: string }) => (
  <TabBarIcon color={color} routeName="Profile" />
);

const MainTabNavigator = () => {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#21D4B4',
        tabBarInactiveTintColor: '#6F7384',
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 68 + insets.bottom,
            paddingBottom: 7 + insets.bottom,
          },
        ],
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarIcon: renderHomeIcon }}
      />
      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{ tabBarIcon: renderCategoriesIcon }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'My Cart', tabBarIcon: renderCartIcon }}
      />
      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ tabBarIcon: renderWishlistIcon }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarIcon: renderProfileIcon }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
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
    backgroundColor: '#EE4D4D',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  wishlistBadge: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EE4D4D',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  tabBarLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 10,
    marginBottom: 3,
  },
  tabBar: {
    height: 68,
    paddingTop: 5,
    paddingBottom: 7,
    borderTopWidth: 1,
    borderTopColor: '#F0F1F5',
    backgroundColor: '#FFFFFF',
  },
});

export default MainTabNavigator;

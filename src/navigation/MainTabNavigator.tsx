import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';

import HomeScreen from '../screens/Home/HomeScreen';
import CategoriesScreen from '../screens/Categories/CategoriesScreen';
import CartScreen from '../screens/Cart/CartScreen';
import WishlistScreen from '../screens/Wishlist/WishlistScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';

import type { RootState } from '../store/store';

export type MainTabParamList = {
  Home: undefined;
  Categories: undefined;
  Cart: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

const tabSymbols: Record<keyof MainTabParamList, string> = {
  Home: '⌂',
  Categories: '▦',
  Cart: '▱',
  Wishlist: '♡',
  Profile: '♙',
};

type TabBarIconProps = {
  color: string;
  routeName: keyof MainTabParamList;
};

const TabBarIcon = ({ color, routeName }: TabBarIconProps) => {
  const cartCount = useSelector((state: RootState) =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0),
  );

  return (
    <View style={styles.iconContainer}>
      <Text style={[styles.iconText, { color }]}>{tabSymbols[routeName]}</Text>

      {routeName === 'Cart' && cartCount > 0 ? (
        <View style={styles.cartBadge} />
      ) : null}
    </View>
  );
};

/*
 * Keep these functions outside MainTabNavigator.
 * This prevents React from receiving a new component/function
 * on every navigator render.
 */

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
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,

        tabBarActiveTintColor: '#21D4B4',
        tabBarInactiveTintColor: '#6F7384',

        tabBarLabelStyle: styles.tabBarLabel,

        tabBarStyle: styles.tabBar,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: renderHomeIcon,
        }}
      />

      <Tab.Screen
        name="Categories"
        component={CategoriesScreen}
        options={{
          tabBarIcon: renderCategoriesIcon,
        }}
      />

      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          title: 'My Cart',
          tabBarIcon: renderCartIcon,
        }}
      />

      <Tab.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{
          tabBarIcon: renderWishlistIcon,
        }}
      />

      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: renderProfileIcon,
        }}
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

  iconText: {
    fontSize: 25,
    lineHeight: 27,
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

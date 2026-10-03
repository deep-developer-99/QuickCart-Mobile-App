import React from 'react';
import { Text, View } from 'react-native';
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

const tabSymbols: Record<string, string> = {
  Home: '⌂',
  Categories: '▦',
  Cart: '▱',
  Wishlist: '♡',
  Profile: '♙',
};

const MainTabNavigator = () => {
  const cartCount = useSelector((state: RootState) =>
    state.cart.items.reduce((total, item) => total + item.quantity, 0),
  );

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#21D4B4',
        tabBarInactiveTintColor: '#6F7384',
        tabBarLabelStyle: {
          fontFamily: 'PlusJakartaSans-Regular',
          fontSize: 10,
          marginBottom: 3,
        },
        tabBarStyle: {
          height: 68,
          paddingTop: 5,
          paddingBottom: 7,
          borderTopWidth: 1,
          borderTopColor: '#F0F1F5',
          backgroundColor: '#FFFFFF',
        },
        tabBarIcon: ({ color }) => (
          <View
            style={{
              width: 30,
              height: 28,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 25, color, lineHeight: 27 }}>
              {tabSymbols[route.name]}
            </Text>
            {route.name === 'Cart' && cartCount > 0 ? (
              <View
                style={{
                  position: 'absolute',
                  right: 1,
                  top: 1,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#EE4D4D',
                  borderWidth: 1,
                  borderColor: '#FFFFFF',
                }}
              />
            ) : null}
          </View>
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{ title: 'My Cart' }}
      />
      <Tab.Screen name="Wishlist" component={WishlistScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};

export default MainTabNavigator;

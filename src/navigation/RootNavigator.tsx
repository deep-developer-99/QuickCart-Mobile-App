import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import MainTabNavigator from './MainTabNavigator';
import { useLazyGetMeQuery } from '../api/quickCartApi';
import { getToken, removeToken } from '../services/secureStorage';
import { logout, setCredentials } from '../store/slices/authSlice';
import type { AppDispatch, RootState } from '../store/store';

const RootNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [getMe, { isLoading }] = useLazyGetMeQuery();

  useEffect(() => {
    let mounted = true;

    const restoreSession = async () => {
      try {
        const token = await getToken();

        if (!token) return;

        const response = await getMe().unwrap();

        if (mounted && response.success) {
          dispatch(
            setCredentials({
              user: response.data,
              token,
            }),
          );
        } else if (mounted) {
          await removeToken();
          dispatch(logout());
        }
      } catch (error) {
        console.log('Session restore failed:', error);
        if (mounted) {
          await removeToken();
          dispatch(logout());
        }
      } finally {
        if (mounted) setCheckingAuth(false);
      }
    };

    restoreSession();

    return () => {
      mounted = false;
    };
  }, [dispatch, getMe]);

  if (checkingAuth || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RootNavigator;

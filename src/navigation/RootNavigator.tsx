import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';

import AuthNavigator from './AuthNavigator';
import AppNavigator from './AppNavigator';

import { useLazyGetMeQuery } from '../api/quickCartApi';

import { getToken, removeToken } from '../services/secureStorage';

import { setCredentials, logout } from '../store/slices/authSlice';

import type { AppDispatch, RootState } from '../store/store';

const RootNavigator = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux is the source of truth for the current authentication state.
  const isAuthenticated = useSelector(
    (state: RootState) => state.auth.isAuthenticated,
  );

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [getMe, { isLoading }] = useLazyGetMeQuery();

  // Restore an existing login session when the app starts.
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const token = await getToken();

        // No saved token means the user needs to log in.
        if (!token) {
          setCheckingAuth(false);
          return;
        }

        console.log('Saved JWT found. Validating session...');

        // Validate the saved JWT with the backend.
        const response = await getMe().unwrap();

        if (response.success) {
          console.log('Session restored successfully');

          dispatch(
            setCredentials({
              user: response.data,
              token,
            }),
          );
        } else {
          await removeToken();
          dispatch(logout());
        }
      } catch (error) {
        console.log('Session restore failed:', error);

        await removeToken();
        dispatch(logout());
      } finally {
        setCheckingAuth(false);
      }
    };

    restoreSession();
  }, [dispatch, getMe]);

  // Show a loading screen while restoring an existing session.
  if (checkingAuth || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppNavigator /> : <AuthNavigator />}
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

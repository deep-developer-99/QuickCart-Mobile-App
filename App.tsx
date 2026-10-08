import React from 'react';
import { StatusBar } from 'react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/theme/globalFont';

import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';

const ThemedApp = () => {
  const { mode } = useTheme();

  return (
    <>
      <StatusBar
        barStyle={mode === 'dark' ? 'light-content' : 'dark-content'}
      />
      <RootNavigator />
    </>
  );
};

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

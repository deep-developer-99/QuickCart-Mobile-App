import React from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import './src/theme/globalFont';

import RootNavigator from './src/navigation/RootNavigator';
import { store } from './src/store/store';

const App = () => {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
};

export default App;

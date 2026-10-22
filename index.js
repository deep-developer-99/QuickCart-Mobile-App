/**
 * @format
 */

import { AppRegistry } from 'react-native';
import { getMessaging, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import App from './App';
import { name as appName } from './app.json';

setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  // Notification payloads are displayed by the OS while the app is backgrounded
  // or terminated. Data is handled when the user opens the notification.
  console.log('Background notification received:', remoteMessage.messageId);
});

AppRegistry.registerComponent(appName, () => App);

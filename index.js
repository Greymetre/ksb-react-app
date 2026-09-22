/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import "react-native-gesture-handler";
import { registerBackgroundPushHandler } from './src/services/pushNotifications';

// Firebase needs this set before the app renders, for messages that arrive in the background.
registerBackgroundPushHandler();

AppRegistry.registerComponent(appName, () => App);

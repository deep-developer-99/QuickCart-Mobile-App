import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SplashScreenStyles } from './SplashScreen.styles';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={SplashScreenStyles.container}>
      <Text style={SplashScreenStyles.logo}>QuickCart</Text>

      <Text style={SplashScreenStyles.tagline}>
        Everything you need, delivered fast.
      </Text>
    </SafeAreaView>
  );
};

export default SplashScreen;

import React, { useEffect } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SplashScreenStyles } from './SplashScreen.styles';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import QuickCartWordmark from '../../components/QuickCartWordmark';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SplashScreenContent = () => {
  const { theme, mode } = useTheme();
  const styles = SplashScreenStyles(theme.colors, mode);

  return (
    <SafeAreaView style={styles.container}>
      <QuickCartWordmark
        style={styles.brand}
        textStyle={styles.logo}
        tagline="Asia’s No 1 Ecommerce App"
        taglineStyle={styles.tagline}
        accessibilityLabel="QuickCart. Asia’s No 1 Ecommerce App"
        markSize={38}
        gap={3}
      />
    </SafeAreaView>
  );
};

const SplashScreen = ({ navigation }: Props) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return <SplashScreenContent />;
};

export default SplashScreen;

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SplashScreenStyles } from './SplashScreen.styles';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

const SplashScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = SplashScreenStyles(theme.colors);
  useEffect(() => {
    const timer = setTimeout(() => {
      navigation.replace('Onboarding');
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.logo}>QuickCart</Text>

      <Text style={styles.tagline}>{t('ui.splash.tagline')}</Text>
    </SafeAreaView>
  );
};

export default SplashScreen;

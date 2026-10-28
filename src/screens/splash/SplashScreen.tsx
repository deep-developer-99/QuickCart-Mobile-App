import { AppText as Text } from '../../components/AppText';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { SplashScreenStyles } from './SplashScreen.styles';
import { useTheme } from '../../theme';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import QuickCartWordmark from '../../components/QuickCartWordmark';

type Props = NativeStackScreenProps<AuthStackParamList, 'Splash'>;

export const SplashScreenContent = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = SplashScreenStyles(theme.colors);

  return (
    <SafeAreaView style={styles.container}>
      <QuickCartWordmark
        textStyle={styles.logo}
        markSize={30}
        badgeSize={46}
        badgeColor={theme.colors.white}
        gap={8}
      />

      <Text style={styles.tagline}>{t('ui.splash.tagline')}</Text>
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

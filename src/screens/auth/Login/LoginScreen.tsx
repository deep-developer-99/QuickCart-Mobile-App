import { AppText as Text, AppTextInput as TextInput } from '../../../components/AppText';
import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  KeyboardAvoidingView,
  Alert,
  Platform,
  Pressable,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import {
  useGoogleLoginMutation,
  useSendOtpMutation,
} from '../../../api/quickCartApi';
import { AuthStackParamList } from '../../../navigation/AuthNavigator';
import { LoginScreenStyles } from './LoginScreen.styles';
import { useTheme } from '../../../theme';
import {
  isErrorWithCode,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { signInWithGoogle as getGoogleIdToken } from '../../../services/googleSignIn';
import { saveToken } from '../../../services/secureStorage';
import { setCredentials } from '../../../store/slices/authSlice';
import type { AppDispatch } from '../../../store/store';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = LoginScreenStyles(theme.colors);
  const [mobileNumber, setMobileNumber] = useState('');

  const [sendOtp, { isLoading }] = useSendOtpMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] =
    useGoogleLoginMutation();
  const [isGoogleSignInLoading, setIsGoogleSignInLoading] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  const handleContinue = async () => {
    if (mobileNumber.length !== 10 || isLoading) {
      return;
    }

    try {
      await sendOtp(mobileNumber).unwrap();

      navigation.navigate('OTP', { phone: mobileNumber });
    } catch {
      // Keep authentication response details out of logs.
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading || isGoogleSignInLoading) {
      return;
    }

    setIsGoogleSignInLoading(true);

    try {
      const firebaseIdToken = await getGoogleIdToken();

      if (!firebaseIdToken) {
        return;
      }

      if (typeof firebaseIdToken !== 'string' || !firebaseIdToken.trim()) {
        throw new Error('Google Sign-In did not return an ID token');
      }

      const response = await googleLogin({
        idToken: firebaseIdToken,
      }).unwrap();

      const backendToken = response?.token;
      const user = response?.data;
      const isJwt =
        typeof backendToken === 'string' &&
        backendToken.trim().split('.').length === 3 &&
        backendToken.trim().split('.').every(Boolean);
      if (
        response?.success !== true ||
        !isJwt ||
        !user ||
        ![user.id, user.name, user.email, user.role].every(
          value => typeof value === 'string' && value.trim().length > 0,
        )
      ) {
        throw new Error('Google authentication did not return valid credentials');
      }

      await saveToken(backendToken.trim());

      dispatch(
        setCredentials({
          user,
          token: backendToken.trim(),
        }),
      );
    } catch (error) {
      if (
        isErrorWithCode(error) &&
        error.code === statusCodes.SIGN_IN_CANCELLED
      ) {
        return;
      }

      Alert.alert(t('auth.loginFailed'), t('auth.googleLoginFailed'));
    } finally {
      setIsGoogleSignInLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('ui.auth.welcome', { brand: 'QuickCart' })}</Text>

          <Text style={styles.subtitle}>
            {t('ui.auth.loginSubtitle')}
          </Text>

          <View style={styles.inputSection}>
            <Text style={styles.label}>{t('ui.auth.mobileNumber')}</Text>

            <View style={styles.phoneInputContainer}>
              <Text style={styles.countryCode}>+91</Text>

              <TextInput
                style={styles.input}
                value={mobileNumber}
                onChangeText={text =>
                  setMobileNumber(text.replace(/[^0-9]/g, ''))
                }
                placeholder={t('ui.auth.enterMobileNumber')}
                placeholderTextColor={theme.colors.grey150}
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          <Pressable
            style={[
              styles.continueButton,
              mobileNumber.length !== 10 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={mobileNumber.length !== 10 || isLoading}
          >
            <Text style={styles.continueButtonText}>
              {isLoading ? t('ui.auth.sendingOtp') : t('ui.auth.continue')}
            </Text>
          </Pressable>

          <View style={styles.dividerContainer}>
            <View style={styles.divider} />

            <Text style={styles.orText}>{t('ui.auth.or')}</Text>

            <View style={styles.divider} />
          </View>

          <Pressable
            style={styles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading || isGoogleSignInLoading}
          >
            <Text style={styles.googleIcon}>G</Text>

            <Text style={styles.googleButtonText}>
              {isGoogleLoading || isGoogleSignInLoading
                ? t('auth.signingIn')
                : t('auth.continueWithGoogle')}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

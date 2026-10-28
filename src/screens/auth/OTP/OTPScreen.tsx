import { AppText as Text, AppTextInput as TextInput } from '../../../components/AppText';
import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store/store';
import { setCredentials } from '../../../store/slices/authSlice';

import { saveToken } from '../../../services/secureStorage';

import { AuthStackParamList } from '../../../navigation/AuthNavigator';
import { OTPScreenStyles } from './OTPScreen.styles';
import { useTheme } from '../../../theme';
import { useVerifyOtpMutation } from '../../../api/quickCartApi';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

type TextInputRef = React.ElementRef<typeof TextInput>;

const OTPScreen = ({ route }: Props) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = OTPScreenStyles(theme.colors);
  const { phone } = route.params;
  const dispatch = useDispatch<AppDispatch>();

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verifyOtp, { isLoading }] = useVerifyOtpMutation();

  const inputRefs = useRef<Array<TextInputRef | null>>([]);

  const handleChange = (value: string, index: number) => {
    const digit = value.replace(/[^0-9]/g, '');

    const newOtp = [...otp];
    newOtp[index] = digit.slice(-1);

    setOtp(newOtp);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredOtp = otp.join('');

    if (enteredOtp.length !== 6 || isLoading) {
      return;
    }

    try {
      const response = await verifyOtp({
        phone,
        code: enteredOtp,
      }).unwrap();

      const token = response?.token;

      if (response?.success && typeof token === 'string' && token.trim()) {
        await saveToken(token.trim());

        dispatch(
          setCredentials({
            user: response.data,
            token: token.trim(),
          }),
        );

        Alert.alert(
          t('ui.auth.loginSuccessful'),
          t('ui.auth.loginSuccessfulMessage'),
        );
      } else {
        Alert.alert(t('ui.auth.loginFailed'), t('ui.auth.tokenMissing'));
      }
    } catch {
      Alert.alert(t('ui.auth.otpFailed'), t('ui.auth.otpError'));
    }
  };
  const handleResend = () => {
    // OTP resend is not implemented yet.
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{t('ui.auth.verifyNumber')}</Text>

          <Text style={styles.description}>
            {t('ui.auth.enterOtpDescription')}
          </Text>

          <View style={styles.otpContainer}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={ref => {
                  inputRefs.current[index] = ref;
                }}
                style={styles.otpInput}
                value={digit}
                onChangeText={value => handleChange(value, index)}
                keyboardType="number-pad"
                maxLength={1}
                textAlign="center"
                editable={!isLoading}
              />
            ))}
          </View>

          <Pressable
            style={[
              styles.verifyButton,
              (otp.join('').length !== 6 || isLoading) &&
                styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={otp.join('').length !== 6 || isLoading}
          >
            <Text style={styles.verifyButtonText}>
              {isLoading ? t('ui.auth.verifyingOtp') : t('ui.auth.verifyOtp')}
            </Text>
          </Pressable>

          <Pressable onPress={handleResend} disabled={isLoading}>
            <Text style={styles.resendText}>{t('ui.auth.resendPrompt')}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default OTPScreen;

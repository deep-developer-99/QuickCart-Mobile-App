import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  useGoogleLoginMutation,
  useSendOtpMutation,
} from '../../../api/quickCartApi';
import { AuthStackParamList } from '../../../navigation/AuthNavigator';
import { LoginScreenStyles } from './LoginScreen.styles';
import { signInWithGoogle } from '../../../services/googleSignIn';
import { saveToken } from '../../../services/secureStorage';
import { setCredentials } from '../../../store/slices/authSlice';
import type { AppDispatch } from '../../../store/store';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const LoginScreen = ({ navigation }: Props) => {
  const [mobileNumber, setMobileNumber] = useState('');

  const [sendOtp, { isLoading }] = useSendOtpMutation();
  const [googleLogin, { isLoading: isGoogleLoading }] =
    useGoogleLoginMutation();
  const dispatch = useDispatch<AppDispatch>();

  const handleContinue = async () => {
    if (mobileNumber.length !== 10 || isLoading) {
      return;
    }

    try {
      console.log('Sending OTP to:', mobileNumber);

      const response = await sendOtp(mobileNumber).unwrap();

      console.log('OTP sent successfully:', response);

      navigation.navigate('OTP', { phone: mobileNumber });
    } catch (error) {
      console.log('Send OTP error:', error);
    }
  };

  const handleGoogleLogin = async () => {
    if (isGoogleLoading) {
      return;
    }

    try {
      const firebaseIdToken = await signInWithGoogle();

      if (!firebaseIdToken) {
        console.log('Google Sign-In cancelled');
        return;
      }

      const response = await googleLogin({
        idToken: firebaseIdToken,
      }).unwrap();

      await saveToken(response.token);

      dispatch(
        setCredentials({
          user: response.data,
          token: response.token,
        }),
      );

      console.log('Google Login successful');
    } catch (error) {
      console.error('Google Login error:', error);
    }
  };

  return (
    <SafeAreaView style={LoginScreenStyles.safeArea} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={LoginScreenStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={LoginScreenStyles.content}>
          <Text style={LoginScreenStyles.title}>Welcome to QuickCart</Text>

          <Text style={LoginScreenStyles.subtitle}>
            Login or create an account to continue
          </Text>

          <View style={LoginScreenStyles.inputSection}>
            <Text style={LoginScreenStyles.label}>Mobile Number</Text>

            <View style={LoginScreenStyles.phoneInputContainer}>
              <Text style={LoginScreenStyles.countryCode}>+91</Text>

              <TextInput
                style={LoginScreenStyles.input}
                value={mobileNumber}
                onChangeText={text =>
                  setMobileNumber(text.replace(/[^0-9]/g, ''))
                }
                placeholder="Enter mobile number"
                placeholderTextColor="#6F7384"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          <Pressable
            style={[
              LoginScreenStyles.continueButton,
              mobileNumber.length !== 10 &&
                LoginScreenStyles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={mobileNumber.length !== 10 || isLoading}
          >
            <Text style={LoginScreenStyles.continueButtonText}>
              {isLoading ? 'Sending OTP...' : 'Continue'}
            </Text>
          </Pressable>

          <View style={LoginScreenStyles.dividerContainer}>
            <View style={LoginScreenStyles.divider} />

            <Text style={LoginScreenStyles.orText}>OR</Text>

            <View style={LoginScreenStyles.divider} />
          </View>

          <Pressable
            style={LoginScreenStyles.googleButton}
            onPress={handleGoogleLogin}
            disabled={isGoogleLoading}
          >
            <Text style={LoginScreenStyles.googleIcon}>G</Text>

            <Text style={LoginScreenStyles.googleButtonText}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

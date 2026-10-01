import React, { useRef, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch } from 'react-redux';
import type { AppDispatch } from '../../../store/store';
import { setCredentials } from '../../../store/slices/authSlice';

import { saveToken } from '../../../services/secureStorage';

import { AuthStackParamList } from '../../../navigation/AuthNavigator';
import { OTPScreenStyles } from './OTPScreen.styles';
import { useVerifyOtpMutation } from '../../../api/quickCartApi';

type Props = NativeStackScreenProps<AuthStackParamList, 'OTP'>;

type TextInputRef = React.ElementRef<typeof TextInput>;

const OTPScreen = ({ route }: Props) => {
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

    console.log('Verify button pressed');
    console.log('Phone:', phone);
    console.log('OTP:', enteredOtp);

    try {
      const response = await verifyOtp({
        phone,
        code: enteredOtp,
      }).unwrap();

      console.log('OTP verified successfully:', response);

      if (response.success && response.token) {
        await saveToken(response.token);

        dispatch(
          setCredentials({
            user: response.data,
            token: response.token,
          }),
        );

        Alert.alert(
          'Login Successful',
          'You have been successfully logged in.',
        );
      } else {
        Alert.alert('Login Failed', 'Authentication token was not received.');
      }
    } catch (error) {
      console.log('Verify OTP error:', error);

      Alert.alert('OTP Verification Failed', JSON.stringify(error));
    }
  };
  const handleResend = () => {
    console.log('Resend OTP for:', phone);
  };

  return (
    <View style={OTPScreenStyles.container}>
      <View style={OTPScreenStyles.content}>
        <Text style={OTPScreenStyles.title}>Verify your number</Text>

        <Text style={OTPScreenStyles.description}>
          Enter the 6-digit OTP sent to your mobile number.
        </Text>

        <View style={OTPScreenStyles.otpContainer}>
          {otp.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => {
                inputRefs.current[index] = ref;
              }}
              style={OTPScreenStyles.otpInput}
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
            OTPScreenStyles.verifyButton,
            (otp.join('').length !== 6 || isLoading) &&
              OTPScreenStyles.verifyButtonDisabled,
          ]}
          onPress={handleVerify}
          disabled={otp.join('').length !== 6 || isLoading}
        >
          <Text style={OTPScreenStyles.verifyButtonText}>
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Text>
        </Pressable>

        <Pressable onPress={handleResend} disabled={isLoading}>
          <Text style={OTPScreenStyles.resendText}>
            Didn't receive the OTP? Resend
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

export default OTPScreen;

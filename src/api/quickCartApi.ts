import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const quickCartApi = createApi({
  reducerPath: 'quickCartApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://quickcart-bxod.onrender.com/api',
  }),

  endpoints: builder => ({
    // Send OTP to mobile number
    sendOtp: builder.mutation<unknown, string>({
      query: phone => ({
        url: '/auth/phone/send-otp',
        method: 'POST',
        body: {
          phone,
        },
      }),
    }),

    // Verify OTP
    verifyOtp: builder.mutation<
      unknown,
      {
        phone: string;
        code: string;
      }
    >({
      query: ({ phone, code }) => ({
        url: '/auth/phone/verify-otp',
        method: 'POST',
        body: {
          phone,
          code,
        },
      }),
    }),
  }),
});

export const { useSendOtpMutation, useVerifyOtpMutation } = quickCartApi;

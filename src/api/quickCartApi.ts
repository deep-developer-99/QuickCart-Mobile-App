import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

import { getToken } from '../services/secureStorage';

interface VerifyOtpResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    role: string;
  };
  token: string;
}

interface MeResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    role: string;
  };
}

export const quickCartApi = createApi({
  reducerPath: 'quickCartApi',

  baseQuery: fetchBaseQuery({
    baseUrl: 'https://quickcart-bxod.onrender.com/api',

    prepareHeaders: async headers => {
      const token = await getToken();

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return headers;
    },
  }),

  endpoints: builder => ({
    // Get current logged-in user
    getMe: builder.query<MeResponse, void>({
      query: () => ({
        url: '/auth/me',
        method: 'GET',
      }),
    }),

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
      VerifyOtpResponse,
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

export const {
  useSendOtpMutation,
  useVerifyOtpMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
} = quickCartApi;

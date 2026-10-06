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

export interface CategoryResponse {
  success: boolean;
  data: Array<{
    _id: string;
    name: string;
    image?: string;
  }>;
}

export interface ProductResponse {
  success: boolean;
  data: Array<{
    _id: string;
    name: string;
    image?: string;
    price: number;
    discountPrice?: number;
    stock: number;
    category?: string | { _id: string; name: string };
  }>;
}

interface GoogleLoginResponse {
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
  tagTypes: ['Categories', 'Products', 'Me'],

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
    // Get categories
    getCategories: builder.query<CategoryResponse, void>({
      query: () => ({
        url: '/categories',
        method: 'GET',
      }),
      providesTags: ['Categories'],
    }),

    // Get products / search products
    getProducts: builder.query<ProductResponse, string | undefined>({
      query: search => ({
        url: '/products',
        method: 'GET',
        params: search ? { search } : undefined,
      }),
      providesTags: ['Products'],
    }),

    // Google Login
    googleLogin: builder.mutation<
      GoogleLoginResponse,
      {
        idToken: string;
      }
    >({
      query: ({ idToken }) => ({
        url: '/auth/google',
        method: 'POST',
        body: {
          idToken,
        },
      }),
    }),

    // Get current logged-in user
    getMe: builder.query<MeResponse, void>({
      query: () => ({
        url: '/auth/me',
        method: 'GET',
      }),
      providesTags: ['Me'],
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
  useGoogleLoginMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useGetCategoriesQuery,
  useGetProductsQuery,
} = quickCartApi;

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

export interface CartProduct {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  price: number;
  discountPrice?: number;
  stock: number;
  category?:
    | {
        _id: string;
        name: string;
        image?: string;
      }
    | string;
  vendor?:
    | {
        _id: string;
        shopName?: string;
      }
    | string;
  isActive?: boolean;
}

export interface CartItem {
  product: CartProduct;
  quantity: number;
}

export interface Cart {
  _id: string;
  user: string;
  items: CartItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CartResponse {
  success: boolean;
  data: Cart;
  message?: string;
}

export interface CartMutationResponse extends CartResponse {
  message: string;
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
  tagTypes: ['Categories', 'Products', 'Me', 'Cart'],

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

    // Get current user's cart
    getCart: builder.query<CartResponse, void>({
      query: () => ({
        url: '/cart',
        method: 'GET',
      }),
      providesTags: ['Cart'],
    }),

    // Add product to cart
    addToCart: builder.mutation<
      CartMutationResponse,
      { productId: string; quantity: number }
    >({
      query: body => ({
        url: '/cart',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Cart'],
    }),

    // Update cart item quantity
    updateCartItem: builder.mutation<
      CartMutationResponse,
      { productId: string; quantity: number }
    >({
      query: ({ productId, quantity }) => ({
        url: `/cart/${productId}`,
        method: 'PUT',
        body: { quantity },
      }),
      invalidatesTags: ['Cart'],
    }),

    // Remove product from cart
    removeCartItem: builder.mutation<CartMutationResponse, string>({
      query: productId => ({
        url: `/cart/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),

    // Clear cart
    clearCart: builder.mutation<{ success: boolean; message: string }, void>({
      query: () => ({
        url: '/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
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
  useGetCartQuery,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = quickCartApi;

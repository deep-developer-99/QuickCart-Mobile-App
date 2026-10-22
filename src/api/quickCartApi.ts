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
    description?: string;
    image?: string;
    images?: string[];
    price: number;
    discountPrice?: number;
    stock: number;
    rating?: number;
    reviews?: number;
    category?: string | { _id: string; name: string };
  }>;
}

export interface Banner {
  _id: string;
  image?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  redirectType?: string;
  redirectValue?: string;
  order?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface BannerResponse {
  success: boolean;
  data?: Banner[] | { banners?: Banner[] };
  banners?: Banner[];
  message?: string;
}

export type ProductsQuery =
  | string
  | {
      search?: string;
      category?: string;
    }
  | undefined;

export interface WishlistResponse {
  success: boolean;
  data:
    | CartProduct[]
    | {
        products?: CartProduct[];
      };
  message?: string;
}

export interface WishlistMutationResponse {
  success: boolean;
  message: string;
  data?: CartProduct[] | { products?: CartProduct[] };
}

export const getWishlistProducts = (
  response?: WishlistResponse,
): CartProduct[] => {
  if (!response?.data) return [];
  if (Array.isArray(response.data)) return response.data;
  return Array.isArray(response.data.products) ? response.data.products : [];
};

export interface CartProduct {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  rating?: number;
  reviews?: number;
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
  tagTypes: ['Categories', 'Products', 'Banners', 'Me', 'Cart', 'Wishlist'],

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

    getBanners: builder.query<BannerResponse, void>({
      query: () => ({
        url: '/banners',
        method: 'GET',
      }),
      providesTags: ['Banners'],
    }),

    // Get products / search products
    getProducts: builder.query<ProductResponse, ProductsQuery>({
      query: request => {
        const params =
          typeof request === 'string'
            ? { search: request }
            : request
              ? {
                  ...(request.search ? { search: request.search } : {}),
                  ...(request.category ? { category: request.category } : {}),
                }
              : undefined;

        return {
          url: '/products',
          method: 'GET',
          params,
        };
      },
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

    // Get current user's wishlist
    getWishlist: builder.query<WishlistResponse, void>({
      query: () => ({
        url: '/wishlist',
        method: 'GET',
      }),
      providesTags: ['Wishlist'],
    }),

    // Add product to wishlist
    addToWishlist: builder.mutation<
      WishlistMutationResponse,
      { productId: string }
    >({
      query: body => ({
        url: '/wishlist',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Wishlist'],
    }),

    // Remove product from wishlist
    removeFromWishlist: builder.mutation<WishlistMutationResponse, string>({
      query: productId => ({
        url: `/wishlist/${productId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
    }),

    // Clear current user's wishlist
    clearWishlist: builder.mutation<
      { success: boolean; message: string },
      void
    >({
      query: () => ({
        url: '/wishlist',
        method: 'DELETE',
      }),
      invalidatesTags: ['Wishlist'],
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

    registerFcmToken: builder.mutation<
      { success: boolean; message?: string },
      { token: string }
    >({
      query: body => ({
        url: '/notifications/fcm-token',
        method: 'POST',
        body,
      }),
    }),

    removeFcmToken: builder.mutation<
      { success: boolean; message?: string },
      { token: string }
    >({
      query: body => ({
        url: '/notifications/fcm-token',
        method: 'DELETE',
        body,
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
  useGoogleLoginMutation,
  useGetMeQuery,
  useLazyGetMeQuery,
  useRegisterFcmTokenMutation,
  useRemoveFcmTokenMutation,
  useGetCategoriesQuery,
  useGetBannersQuery,
  useGetProductsQuery,
  useGetCartQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useClearWishlistMutation,
  useAddToCartMutation,
  useUpdateCartItemMutation,
  useRemoveCartItemMutation,
  useClearCartMutation,
} = quickCartApi;

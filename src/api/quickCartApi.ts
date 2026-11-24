import {
  createApi,
  fetchBaseQuery,
  type BaseQueryFn,
  type FetchArgs,
  type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

import { getToken, removeToken } from '../services/secureStorage';
import { getSubcategoriesPath } from '../utils/categoryBrowsing';
import {
  getApiErrorDiagnostics,
  logApiDiagnostic,
  safeApiPath,
} from '../services/apiDiagnostics';
import {
  wishlistClearOptimistic,
  wishlistClearRolledBack,
  wishlistClearSettled,
  wishlistHydrated,
  wishlistOperationRolledBack,
  wishlistOperationSettled,
  wishlistOptimisticSet,
  wishlistRequestFailed,
  wishlistRequestStarted,
} from '../store/slices/wishlistSlice';
import { logout } from '../store/slices/authSlice';
import { deactivateLocalCart } from '../services/cartStorage';

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
    variants?: ProductVariant[];
    rating?: number;
    reviews?: number;
    category?: string | { _id: string; name: string };
    subCategory?: string | { _id: string; name: string; image?: string };
  }>;
  pagination?: {
    currentPage: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface Subcategory {
  _id: string;
  name: string;
  image?: string;
  parentCategory?: string | { _id: string };
}

export interface Banner {
  _id: string;
  image?: string;
  imageUrl?: string;
  mobileImage?: string;
  title?: string;
  description?: string;
  redirectType?: string;
  redirectValue?: string;
  order?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
}

export interface MobileNavigationItem {
  categoryId: string;
  name: string;
  image: string;
  displayOrder: number;
}

export interface BannerResponse {
  success: boolean;
  data?: Banner[] | { banners?: Banner[] };
  banners?: Banner[];
  message?: string;
}

export interface PublishedOffer {
  _id: string;
  title: string;
  message: string;
  redirectType: 'category' | 'product';
  redirectValue: string;
  status?: 'published';
}

export type ProductsQuery =
  | string
  | {
      search?: string;
      category?: string;
      subCategory?: string;
      page?: number;
      limit?: number;
      sort?: 'priceLow' | 'priceHigh' | 'az' | 'za';
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

export interface WishlistMutationArg {
  productId: string;
  product?: CartProduct;
  userId?: string;
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
  variants?: ProductVariant[];
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

export interface ProductVariant {
  _id: string;
  quantity: number;
  unit: string;
  price: number;
  discountPrice?: number;
  stock: number;
  isActive: boolean;
}

export interface CartItem {
  product: CartProduct;
  variantId?: string;
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
    id?: string;
    _id?: string;
    name: string;
    email: string;
    phone?: string;
    profileImage?: string;
    role: string;
  };
}

const API_BASE_URL = 'https://quickcart-bxod.onrender.com/api';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,

  prepareHeaders: async headers => {
    const token = await getToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

const diagnosticBaseQuery: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const method = typeof args === 'string' ? 'GET' : args.method ?? 'GET';
  const path = safeApiPath(typeof args === 'string' ? args : args.url);
  const startedAt = Date.now();
  const authAtStart = (api.getState() as { auth: { user: { id: string } | null; token: string | null } }).auth;
  const requestInfo = {
    operation: api.endpoint,
    method,
    path,
    baseUrlConfigured: Boolean(API_BASE_URL),
  };

  logApiDiagnostic('info', 'request.start', requestInfo);

  try {
    const result = await rawBaseQuery(args, api, extraOptions);
    const authPresent = Boolean(
      result.meta?.request.headers.get('authorization'),
    );

    const currentAuth = (api.getState() as { auth: { user: { id: string } | null; token: string | null } }).auth;
    if (authAtStart.user?.id !== currentAuth.user?.id || authAtStart.token !== currentAuth.token) {
      return { error: { status: "CUSTOM_ERROR", error: "Account changed during request." } };
    }
    if (result.error?.status === 401 && authAtStart.user?.id && authPresent) {
      const code = (result.error.data as { code?: string } | undefined)?.code;
      if (code === 'ACCOUNT_INACTIVE') void deactivateLocalCart(authAtStart.user.id).catch(() => console.warn('Unable to clear deactivated cart.'));
      api.dispatch(logout());
      void removeToken(authAtStart.token).catch(() => console.warn('Unable to clear expired token.'));
    }
    if (result.error) {
      logApiDiagnostic('warn', 'request.failed', {
        ...requestInfo,
        ...getApiErrorDiagnostics(result.error),
        authPresent,
        durationMs: Date.now() - startedAt,
      });
      return result;
    }

    logApiDiagnostic('info', 'request.complete', {
      ...requestInfo,
      httpStatus: result.meta?.response?.status,
      authPresent,
      durationMs: Date.now() - startedAt,
    });
    return result;
  } catch (error) {
    logApiDiagnostic('warn', 'request.failed', {
      ...requestInfo,
      errorCategory: 'client_setup_error',
      errorType: error instanceof Error ? 'Error' : 'NonError',
      authPresent: null,
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
};

const wishlistMutationQueues = new Map<string, Promise<void>>();

const withWishlistMutationLock = async <T,>(key: string, task: () => Promise<T>): Promise<T> => {
  const previous = wishlistMutationQueues.get(key) ?? Promise.resolve();
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const queued = previous.then(() => gate);
  wishlistMutationQueues.set(key, queued);
  await previous;

  try {
    return await task();
  } finally {
    release();
    if (wishlistMutationQueues.get(key) === queued) wishlistMutationQueues.delete(key);
  }
};

const wishlistLockKey = (userId: string | undefined, productId: string) =>
  `${userId ?? 'anonymous'}:${productId}`;

const logoutIfWishlistUnauthorized = (
  error: unknown,
  userId: string,
  dispatch: (action: ReturnType<typeof logout>) => unknown,
  getState: () => unknown,
) => {
  const requestError = error as { error?: FetchBaseQueryError };
  if (requestError?.error?.status !== 401) return;
  const state = getState() as { auth: { user: { id: string } | null } };
  if (state.auth.user?.id === userId) {
    dispatch(logout());
    removeToken().catch(removeError => {
      console.warn('Failed to remove expired authentication token:', removeError);
    });
  }
};

export const quickCartApi = createApi({
  reducerPath: 'quickCartApi',
  tagTypes: ['Categories', 'Products', 'Banners', 'Me', 'Wishlist', 'MobileNavigation'],

  baseQuery: diagnosticBaseQuery,

  endpoints: builder => ({
    // Get categories
    getCategories: builder.query<CategoryResponse, void>({
      query: () => ({
        url: '/categories',
        method: 'GET',
      }),
      providesTags: ['Categories'],
    }),

    getMobileCategoryNavigation: builder.query<{ success: boolean; data: MobileNavigationItem[] }, void>({
      query: () => '/mobile-category-navigation',
      providesTags: ['MobileNavigation'],
    }),

    getSubcategories: builder.query<{ success: boolean; data: Subcategory[] }, string>({
      query: parentCategoryId => ({
        url: getSubcategoriesPath(parentCategoryId),
        method: 'GET',
      }),
      providesTags: (_result, _error, parentCategoryId) => [
        { type: 'Categories', id: parentCategoryId },
      ],
    }),

    getSearchSuggestions: builder.query<{
      data: { isEnabled: boolean; rotationInterval: number; typingSpeedMs?: number; deletingSpeedMs?: number; suggestions: { phrase: string; isActive?: boolean }[] };
    }, void>({
      query: () => '/search-suggestions',
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
                ...(request.subCategory ? { subCategory: request.subCategory } : {}),
                ...(request.page ? { page: request.page } : {}),
                ...(request.limit ? { limit: request.limit } : {}),
                ...(request.sort ? { sort: request.sort } : {}),
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

    getProductById: builder.query<
      { success: boolean; data: CartProduct; message?: string },
      string
    >({
      query: productId => ({
        url: `/products/${encodeURIComponent(productId)}`,
        method: 'GET',
      }),
      providesTags: (_result, _error, productId) => [
        { type: 'Products', id: productId },
      ],
    }),

    getPublishedOffer: builder.query<
      { success: boolean; data: PublishedOffer },
      string
    >({
      query: offerId => ({
        url: `/offers/${encodeURIComponent(offerId)}`,
        method: 'GET',
      }),
    }),

    // Get current user's wishlist
    getWishlist: builder.query<WishlistResponse, void>({
      query: () => ({
        url: '/wishlist',
        method: 'GET',
      }),
      providesTags: ['Wishlist'],
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled }) {
        const state = getState() as unknown as {
          auth: { user: { id: string } | null };
          wishlist: { ownerId: string | null; revision: number };
        };
        const userId = state.auth.user?.id;
        if (!userId || state.wishlist.ownerId !== userId) return;
        const startedAtRevision = state.wishlist.revision;
        dispatch(wishlistRequestStarted({ userId }));
        try {
          const { data } = await queryFulfilled;
          if (!data.success) throw new Error(data.message || 'Wishlist request failed.');
          dispatch(wishlistHydrated({
            userId,
            startedAtRevision,
            products: getWishlistProducts(data),
          }));
        } catch (error) {
          logoutIfWishlistUnauthorized(error, userId, dispatch, getState);
          dispatch(wishlistRequestFailed({ userId }));
        }
      },
    }),

    // Add product to wishlist
    addToWishlist: builder.mutation<
      WishlistMutationResponse,
      WishlistMutationArg
    >({
      queryFn: async ({ productId, userId: requestedUserId }, api, _extraOptions, baseQuery) => {
        const currentUserId = (api.getState() as { auth: { user: { id: string } | null } }).auth.user?.id;
        const userId = requestedUserId ?? currentUserId;
        return withWishlistMutationLock(wishlistLockKey(userId, productId), async () => {
          const activeUserId = (api.getState() as { auth: { user: { id: string } | null } }).auth.user?.id;
          if (!userId || activeUserId !== userId) {
            return { error: { status: 401, data: 'Authentication changed before wishlist update.' } };
          }
          const result = await baseQuery({ url: '/wishlist', method: 'POST', body: { productId } });
          if (result.error) return { error: result.error };
          return { data: result.data as WishlistMutationResponse };
        });
      },
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled, requestId }) {
        const state = getState() as unknown as {
          auth: { user: { id: string } | null };
          wishlist: { ownerId: string | null; items: CartProduct[] };
        };
        const userId = state.auth.user?.id;
        if (!userId || state.wishlist.ownerId !== userId || (arg.userId && arg.userId !== userId)) return;
        dispatch(wishlistOptimisticSet({
          userId,
          productId: arg.productId,
          product: arg.product,
          isWishlisted: true,
          operationId: requestId,
        }));
        try {
          const { data } = await queryFulfilled;
          if (!data.success) throw new Error(data.message || 'Wishlist update failed.');
          dispatch(wishlistOperationSettled({
            userId,
            productId: arg.productId,
            operationId: requestId,
            isWishlisted: true,
            product: arg.product,
          }));
        } catch (error) {
          logoutIfWishlistUnauthorized(error, userId, dispatch, getState);
          dispatch(wishlistOperationRolledBack({
            userId,
            productId: arg.productId,
            operationId: requestId,
          }));
        }
      },
    }),

    // Remove product from wishlist
    removeFromWishlist: builder.mutation<WishlistMutationResponse, WishlistMutationArg>({
      queryFn: async ({ productId, userId: requestedUserId }, api, _extraOptions, baseQuery) => {
        const currentUserId = (api.getState() as { auth: { user: { id: string } | null } }).auth.user?.id;
        const userId = requestedUserId ?? currentUserId;
        return withWishlistMutationLock(wishlistLockKey(userId, productId), async () => {
          const activeUserId = (api.getState() as { auth: { user: { id: string } | null } }).auth.user?.id;
          if (!userId || activeUserId !== userId) {
            return { error: { status: 401, data: 'Authentication changed before wishlist update.' } };
          }
          const result = await baseQuery({ url: `/wishlist/${productId}`, method: 'DELETE' });
          if (result.error) return { error: result.error };
          return { data: result.data as WishlistMutationResponse };
        });
      },
      async onQueryStarted(arg, { dispatch, getState, queryFulfilled, requestId }) {
        const state = getState() as unknown as {
          auth: { user: { id: string } | null };
          wishlist: { ownerId: string | null; items: CartProduct[] };
        };
        const userId = state.auth.user?.id;
        const { productId } = arg;
        if (!userId || state.wishlist.ownerId !== userId || (arg.userId && arg.userId !== userId)) return;
        dispatch(wishlistOptimisticSet({ userId, productId, isWishlisted: false, operationId: requestId }));
        try {
          const { data } = await queryFulfilled;
          if (!data.success) throw new Error(data.message || 'Wishlist update failed.');
          dispatch(wishlistOperationSettled({ userId, productId, operationId: requestId, isWishlisted: false }));
        } catch (error) {
          logoutIfWishlistUnauthorized(error, userId, dispatch, getState);
          dispatch(wishlistOperationRolledBack({ userId, productId, operationId: requestId }));
        }
      },
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
      async onQueryStarted(_arg, { dispatch, getState, queryFulfilled, requestId }) {
        const state = getState() as unknown as {
          auth: { user: { id: string } | null };
          wishlist: { ownerId: string | null; items: CartProduct[] };
        };
        const userId = state.auth.user?.id;
        if (!userId || state.wishlist.ownerId !== userId) return;
        const previousItems = state.wishlist.items;
        dispatch(wishlistClearOptimistic({ userId, operationId: requestId }));
        try {
          const { data } = await queryFulfilled;
          if (!data.success) throw new Error(data.message || 'Wishlist clear failed.');
          dispatch(wishlistClearSettled({ userId, operationId: requestId }));
        } catch (error) {
          logoutIfWishlistUnauthorized(error, userId, dispatch, getState);
          dispatch(wishlistClearRolledBack({ userId, operationId: requestId, previousItems }));
        }
      },
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
    getDeletionConfirmation: builder.mutation<{ confirmationToken: string }, void>({
      query: () => ({ url: '/auth/delete-account/confirmation', method: 'POST' }),
    }),

    deleteAccount: builder.mutation<
      { success: boolean },
      { reason: string; feedback?: string; confirmationToken: string }
    >({
      query: body => ({ url: '/auth/delete-account', method: 'POST', body }),
    }),

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
  useGetMobileCategoryNavigationQuery,
  useGetSubcategoriesQuery,
  useGetSearchSuggestionsQuery,
  useGetBannersQuery,
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetProductByIdQuery,
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
  useClearWishlistMutation,
} = quickCartApi;

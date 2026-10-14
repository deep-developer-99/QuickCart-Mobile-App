import { quickCartApi } from './quickCartApi';

export interface CreatePaytmSessionRequest {
  addressId: string;
  checkoutMode: 'cart' | 'buyNow';
  paymentMethod:
    | 'UPI_GPAY'
    | 'UPI_PHONEPE'
    | 'UPI_PAYTM'
    | 'UPI_OTHER'
    | 'CARD'
    | 'WALLET';
  productId?: string;
  quantity?: number;
}

export interface PaytmSessionResponse {
  success: boolean;
  data: {
    paymentId: string;
    mid: string;
    orderId: string;
    txnToken: string;
    amount: string;
    callbackUrl: string;
    isStaging: boolean;
    currency: 'INR';
  };
}

export interface VerifyPaytmPaymentRequest {
  paymentId: string;
}

export interface VerifyPaytmPaymentResponse {
  success: boolean;
  message?: string;
  data: {
    status: 'paid' | 'pending' | 'failed' | 'created';
    paymentId: string;
    orderId?: string;
    transactionId?: string;
    order?: unknown;
  };
}

export interface PaytmPaymentStatusResponse {
  success: boolean;
  data: {
    status: 'paid' | 'pending' | 'failed' | 'created';
    paymentId: string;
    orderId?: string;
    amount: number;
    providerOrderId: string;
  };
}

export const paytmPaymentApi = quickCartApi.injectEndpoints({
  endpoints: builder => ({
    createPaytmSession: builder.mutation<
      PaytmSessionResponse,
      CreatePaytmSessionRequest
    >({
      query: body => ({
        url: '/orders/paytm/session',
        method: 'POST',
        body,
      }),
    }),
    verifyPaytmPayment: builder.mutation<
      VerifyPaytmPaymentResponse,
      VerifyPaytmPaymentRequest
    >({
      query: body => ({
        url: '/orders/paytm/verify',
        method: 'POST',
        body,
      }),
    }),
    getPaytmPaymentStatus: builder.query<PaytmPaymentStatusResponse, string>({
      query: paymentId => ({
        url: `/orders/paytm/${paymentId}/status`,
        method: 'GET',
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreatePaytmSessionMutation,
  useVerifyPaytmPaymentMutation,
  useGetPaytmPaymentStatusQuery,
} = paytmPaymentApi;

import { quickCartApi } from './quickCartApi';

export type CashfreePaymentMethod =
  | 'UPI_GPAY'
  | 'UPI_PHONEPE'
  | 'UPI_PAYTM'
  | 'UPI_OTHER'
  | 'CARD'
  | 'WALLET';

export interface CreateCashfreeSessionRequest {
  addressId: string;
  checkoutMode: 'cart' | 'buyNow';
  paymentMethod: CashfreePaymentMethod;
  productId?: string;
  quantity?: number;
}

export interface CashfreeSessionResponse {
  success: boolean;
  data: {
    paymentId: string;
    orderId: string;
    paymentSessionId: string;
    amount: number;
    currency: 'INR';
    environment: 'SANDBOX' | 'PRODUCTION';
  };
}

export interface VerifyCashfreePaymentRequest {
  paymentId: string;
}
export interface VerifyCashfreePaymentResponse {
  success: boolean;
  message?: string;
  data: {
    status: 'paid' | 'pending' | 'failed' | 'paid_needs_review';
    paymentId: string;
    orderId?: string;
    transactionId?: string;
    order?: unknown;
  };
}

export const cashfreePaymentApi = quickCartApi.injectEndpoints({
  endpoints: builder => ({
    createCashfreeSession: builder.mutation<
      CashfreeSessionResponse,
      CreateCashfreeSessionRequest
    >({
      query: body => ({
        url: '/orders/cashfree/session',
        method: 'POST',
        body,
      }),
    }),
    verifyCashfreePayment: builder.mutation<
      VerifyCashfreePaymentResponse,
      VerifyCashfreePaymentRequest
    >({
      query: body => ({ url: '/orders/cashfree/verify', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useCreateCashfreeSessionMutation,
  useVerifyCashfreePaymentMutation,
} = cashfreePaymentApi;

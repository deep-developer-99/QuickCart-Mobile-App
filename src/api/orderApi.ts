import { quickCartApi } from './quickCartApi';

export interface OrderItem {
  product?:
    | string
    | {
        _id: string;
        name?: string;
        image?: string;
        price?: number;
        discountPrice?: number;
      };
  vendor?:
    | string
    | {
        _id: string;
        shopName?: string;
      };
  name: string;
  image: string;
  price: number;
  discountedPrice?: number;
  quantity: number;
}

export type OrderStatus =
  | 'Placed'
  | 'Accepted'
  | 'Out for Delivery'
  | 'Delivered';

export interface MyOrder {
  _id: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: 'COD' | 'RAZORPAY';
  createdAt: string;
  updatedAt?: string;
  address?: unknown;
}

interface OrdersResponse {
  success: boolean;
  message?: string;
  data: MyOrder[];
}

export const orderApi = quickCartApi.injectEndpoints({
  endpoints: builder => ({
    getMyOrders: builder.query<OrdersResponse, void>({
      query: () => ({
        url: '/orders/my-orders',
        method: 'GET',
      }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetMyOrdersQuery } = orderApi;

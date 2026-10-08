import { quickCartApi } from './quickCartApi';

export interface Address {
  _id: string;
  user?: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AddressesResponse {
  success: boolean;
  message?: string;
  data: Address[];
}

export interface AddressResponse {
  success: boolean;
  message?: string;
  data: Address;
}

export interface CreateAddressData {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
}

export const addressApi = quickCartApi.injectEndpoints({
  endpoints: builder => ({
    getAddresses: builder.query<AddressesResponse, void>({
      query: () => ({ url: '/addresses', method: 'GET' }),
    }),
    createAddress: builder.mutation<AddressResponse, CreateAddressData>({
      query: body => ({ url: '/addresses', method: 'POST', body }),
    }),
  }),
  overrideExisting: false,
});

export const { useGetAddressesQuery, useCreateAddressMutation } = addressApi;

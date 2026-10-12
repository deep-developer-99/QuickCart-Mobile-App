import AllInOneSDKManager from 'paytmpayments-allinone-react-native';

export interface PaytmTransactionSession {
  paymentId: string;
  mid: string;
  orderId: string;
  txnToken: string;
  amount: string;
  callbackUrl: string;
  isStaging: boolean;
}

/**
 * Opens Paytm All-in-One checkout. Its result is only a client callback;
 * the backend must still verify the transaction using Paytm's Status API.
 */
export const startPaytmTransaction = (session: PaytmTransactionSession) =>
  AllInOneSDKManager.startTransaction(
    session.orderId,
    session.mid,
    session.txnToken,
    session.amount,
    session.callbackUrl,
    session.isStaging,
    false,
    'quickcartpaytm://',
  );

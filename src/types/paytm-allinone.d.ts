declare module 'paytmpayments-allinone-react-native' {
  interface PaytmTransactionResult {
    STATUS?: string;
    ORDERID?: string;
    TXNAMOUNT?: string;
    TXNID?: string;
    RESPCODE?: string;
    RESPMSG?: string;
    [key: string]: unknown;
  }

  const AllInOneSDKManager: {
    startTransaction(
      orderId: string,
      mid: string,
      txnToken: string,
      amount: string,
      callbackUrl: string,
      isStaging: boolean,
      restrictAppInvoke: boolean,
      urlScheme: string,
    ): Promise<PaytmTransactionResult>;
  };

  export default AllInOneSDKManager;
}

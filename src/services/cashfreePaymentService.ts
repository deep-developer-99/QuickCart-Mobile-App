import {
  CFCallback,
  CFErrorResponse,
  CFPaymentGatewayService,
} from 'react-native-cashfree-pg-sdk';
import { CFEnvironment, CFSession } from 'cashfree-pg-api-contract';

export interface CashfreeTransactionSession {
  paymentId: string;
  orderId: string;
  paymentSessionId: string;
  amount: number;
  currency: 'INR';
  environment: 'SANDBOX' | 'PRODUCTION';
}

/** Opens Cashfree hosted checkout. The backend must verify payment status afterward. */
export const startCashfreeTransaction = (
  session: CashfreeTransactionSession,
): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = () => CFPaymentGatewayService.removeCallback();
    const callback: CFCallback = {
      onVerify: (_orderID: string) => {
        cleanup();
        resolve();
      },
      onError: (error: CFErrorResponse, _orderID: string) => {
        cleanup();
        reject(
          new Error(
            error.getMessage() ||
              'Cashfree checkout was closed or returned an error.',
          ),
        );
      },
    };

    try {
      CFPaymentGatewayService.setCallback(callback);
      const cfEnvironment =
        session.environment === 'PRODUCTION'
          ? CFEnvironment.PRODUCTION
          : CFEnvironment.SANDBOX;
      const cfSession = new CFSession(
        session.paymentSessionId,
        session.orderId,
        cfEnvironment,
      );
      CFPaymentGatewayService.doWebPayment(cfSession);
    } catch (error) {
      cleanup();
      reject(
        error instanceof Error
          ? error
          : new Error('Unable to open Cashfree checkout.'),
      );
    }
  });

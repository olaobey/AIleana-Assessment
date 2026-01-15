export type MonnifyPaymentStatus =
  | 'PAID'
  | 'PENDING'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED';

export type MonnifyAuthResponse = {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseBody: {
    accessToken: string;
    expiresIn: number; // seconds
  };
};

export type MonnifyInitTxResponse = {
  requestSuccessful: boolean;
  responseMessage?: string;
  responseBody: {
    transactionReference: string;
    paymentReference: string;
    checkoutUrl: string;
  };
};

export type MonnifyTxStatusResponse = {
  requestSuccessful: boolean;
  responseBody: {
    paymentStatus: MonnifyPaymentStatus;
    transactionReference?: string;
    paymentReference?: string;
    amountPaid?: number;
  };
};

export type MonnifyInitTxParams = {
  amount: number;
  customerName: string;
  customerEmail: string;
  paymentReference: string;
  paymentDescription: string;
  currencyCode?: string; // default NGN
  contractCode?: string;
  redirectUrl?: string;
  metaData?: Record<string, any>;
};

export interface VerifyAndCreditResult {
  success: boolean;
  message: string;
  transactionId?: string;
  amount?: number;
  credited?: boolean;
}

import axios, { AxiosInstance } from 'axios';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { env } from '../../config/env';
import {
  MonnifyAuthResponse,
  MonnifyInitTxResponse,
  MonnifyTxStatusResponse,
  MonnifyInitTxParams,
} from './monnify.types';

@Injectable()
export class MonnifyClient {
  private http: AxiosInstance;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor() {
    this.http = axios.create({
      // Ensure this is https://sandbox.monnify.com
      baseURL: env.MONNIFY_BASE_URL.replace(/\/$/, ''),
      timeout: 15000,
    });
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && this.cachedToken.expiresAt > now + 30_000) {
      return this.cachedToken.token;
    }

    // SANITIZATION: Remove any whitespace, quotes, or hidden line breaks
    const apiKey = env.MONNIFY_API_KEY.replace(/\s+/g, '').replace(
      /['"]+/g,
      '',
    );
    const secretKey = env.MONNIFY_SECRET_KEY.replace(/\s+/g, '').replace(
      /['"]+/g,
      '',
    );

    // Ensure the format is strictly key:secret
    const credentials = `${apiKey}:${secretKey}`;
    const basic = Buffer.from(credentials).toString('base64');

    try {
      const { data } = await this.http.post<MonnifyAuthResponse>(
        '/api/v2/auth/login',
        {}, // Monnify Sandbox usually accepts empty object, but ensure Content-Length is set
        {
          headers: {
            Authorization: `Basic ${basic}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (data.requestSuccessful) {
        const expiresAt = now + data.responseBody.expiresIn * 1000;
        this.cachedToken = { token: data.responseBody.accessToken, expiresAt };
        return data.responseBody.accessToken;
      }
      throw new Error(data.responseMessage);
    } catch (error: any) {
      console.error('--- MONNIFY AUTH ERROR ---');
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('Status:', error.response?.status);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('Full Body:', error.response?.data);

      // If the error is still "Full authentication required",
      // it means the string 'Basic {hash}' is being rejected.
      throw new UnauthorizedException('Monnify Gateway Rejected Credentials');
    }
  }

  async initTransaction(
    params: MonnifyInitTxParams,
  ): Promise<MonnifyInitTxResponse> {
    const token = await this.getAccessToken();

    const payload = {
      amount: params.amount,
      customerName: params.customerName,
      customerEmail: params.customerEmail,
      paymentReference: params.paymentReference,
      paymentDescription: params.paymentDescription,
      currencyCode: 'NGN',
      contractCode: env.MONNIFY_CONTRACT_CODE.trim().replace(/['"]+/g, ''),
      redirectUrl: env.MONNIFY_REDIRECT_URL,
      paymentMethods: ['CARD', 'ACCOUNT_TRANSFER'],
      metadata: params.metaData || {},
    };

    try {
      const { data } = await this.http.post<MonnifyInitTxResponse>(
        '/api/v1/merchant/transactions/init-transaction',
        payload,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      return data;
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const errorData = error.response?.data;
      console.error('Monnify Init Error:', JSON.stringify(errorData, null, 2));

      throw new BadRequestException(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        errorData?.responseMessage || 'Transaction initialization failed',
      );
    }
  }

  async getTransactionStatusByPaymentReference(
    paymentReference: string,
  ): Promise<MonnifyTxStatusResponse> {
    const token = await this.getAccessToken();
    const { data } = await this.http.get<MonnifyTxStatusResponse>(
      '/api/v2/merchant/transactions/query',
      {
        headers: { Authorization: `Bearer ${token}` },
        params: { paymentReference },
      },
    );
    return data;
  }
}

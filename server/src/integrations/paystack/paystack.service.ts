import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type PaystackInitializeResponse = {
  status: boolean;
  message: string;
  data?: { authorization_url: string; access_code: string; reference: string };
};

type PaystackVerifyResponse = {
  status: boolean;
  message: string;
  data?: PaystackTransaction;
};

export type PaystackRefund = { id: string; status: string };

export type PaystackTransaction = { id: number; status: string; reference: string; amount: number; currency: string };

@Injectable()
export class PaystackService {
  constructor(private readonly config: ConfigService) {}
  async initialize(input: { email: string; amountMinor: string; currency: string; reference: string; auctionId: string; registrationId: string; callbackUrl?: string | null }) {
    const secret = this.secret();
    let response: Response;
    try {
      response = await fetch(`${this.config.getOrThrow<string>('PAYSTACK_BASE_URL')}/transaction/initialize`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: input.email, amount: input.amountMinor, currency: input.currency, reference: input.reference,
          ...(input.callbackUrl ? { callback_url: input.callbackUrl } : {}),
          metadata: { auction_id: input.auctionId, registration_id: input.registrationId, source: 'telegram' },
        }),
      });
    } catch { throw new BadGatewayException('Unable to reach Paystack'); }
    const result = await response.json() as PaystackInitializeResponse;
    if (!response.ok || !result.status || !result.data?.authorization_url) throw new BadGatewayException(result.message || 'Paystack initialization failed');
    return { checkoutUrl: result.data.authorization_url, accessCode: result.data.access_code, reference: result.data.reference };
  }

  /**
   * Paystack's view of a transaction (`abandoned`, `ongoing`, `success`, `failed`, ...), or null when
   * Paystack has no record of the reference. Used only to decide whether a checkout link can be
   * reused; it never confirms a deposit.
   */
  async transactionStatus(reference: string): Promise<string | null> {
    return (await this.verifyTransaction(reference))?.status ?? null;
  }

  /**
   * The transaction as Paystack records it, or null when Paystack has no record of the reference.
   * The call is authenticated with our secret key, so its answer is as trustworthy as a signed webhook.
   */
  async verifyTransaction(reference: string): Promise<PaystackTransaction | null> {
    const secret = this.secret();
    let response: Response;
    try {
      response = await fetch(`${this.config.getOrThrow<string>('PAYSTACK_BASE_URL')}/transaction/verify/${encodeURIComponent(reference)}`, {
        headers: { Authorization: `Bearer ${secret}` },
      });
    } catch { throw new BadGatewayException('Unable to reach Paystack'); }
    const result = await response.json().catch(() => null) as PaystackVerifyResponse | null;
    if (response.status === 404 || (result?.status === false && /not found/i.test(result.message))) return null;
    if (!response.ok || !result?.status || !result.data?.status) throw new BadGatewayException(result?.message || 'Paystack verification failed');
    return result.data;
  }

  /** Asks Paystack to refund a charge to the payer. `amountMinor` defaults to the full charge. */
  async createRefund(input: { reference: string; amountMinor?: string; customerNote?: string }): Promise<PaystackRefund> {
    const result = await this.call<PaystackRefund>('POST', '/refund', {
      transaction: input.reference,
      ...(input.amountMinor ? { amount: Number(input.amountMinor) } : {}),
      ...(input.customerNote ? { customer_note: input.customerNote } : {}),
    }, 'Paystack refund failed');
    return { id: String(result.id), status: result.status };
  }

  /** Completes a `needs-attention` refund by sending it to a bank account the customer gave us. */
  async retryRefund(refundId: string, account: { currency: string; accountNumber: string; bankId: string }): Promise<PaystackRefund> {
    const result = await this.call<PaystackRefund>('POST', `/refund/retry_with_customer_details/${encodeURIComponent(refundId)}`, {
      refund_account_details: { currency: account.currency, account_number: account.accountNumber, bank_id: account.bankId },
    }, 'Paystack could not retry the refund');
    return { id: String(result.id ?? refundId), status: result.status };
  }

  async listBanks(currency: string): Promise<{ id: string; name: string }[]> {
    const banks = await this.call<{ id: number; name: string; active?: boolean }[]>('GET', `/bank?currency=${encodeURIComponent(currency)}&perPage=200`, undefined, 'Could not load banks from Paystack');
    return banks.filter((bank) => bank.active !== false).map((bank) => ({ id: String(bank.id), name: bank.name }));
  }

  private async call<T>(method: 'GET' | 'POST', path: string, body: unknown, failure: string): Promise<T> {
    const secret = this.secret();
    let response: Response;
    try {
      response = await fetch(`${this.config.getOrThrow<string>('PAYSTACK_BASE_URL')}${path}`, {
        method,
        headers: { Authorization: `Bearer ${secret}`, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch { throw new BadGatewayException('Unable to reach Paystack'); }
    const result = await response.json().catch(() => null) as { status?: boolean; message?: string; data?: T } | null;
    if (!response.ok || !result?.status || result.data === undefined) throw new BadGatewayException(result?.message || failure);
    return result.data;
  }

  private secret(): string {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    if (!secret.startsWith('sk_') || secret.endsWith('replace-me')) throw new ServiceUnavailableException('Paystack is not configured');
    return secret;
  }
}

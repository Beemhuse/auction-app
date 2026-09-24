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
  data?: { status: string; reference: string };
};

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
   * reused; it never confirms a deposit. That is the signed webhook's job.
   */
  async transactionStatus(reference: string): Promise<string | null> {
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
    return result.data.status;
  }

  private secret(): string {
    const secret = this.config.getOrThrow<string>('PAYSTACK_SECRET_KEY');
    if (!secret.startsWith('sk_') || secret.endsWith('replace-me')) throw new ServiceUnavailableException('Paystack is not configured');
    return secret;
  }
}

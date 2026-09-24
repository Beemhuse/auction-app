import { createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

@Injectable()
export class EntryCodeService {
  constructor(private readonly config: ConfigService) {}
  generate(registrationId: string): string {
    const digest = createHmac('sha256', this.config.getOrThrow<string>('ENTRY_CODE_SECRET')).update(registrationId).digest();
    let body = '';
    for (let index = 0; index < 8; index += 1) body += ALPHABET[digest[index] % ALPHABET.length];
    return `HMR-${body}`;
  }
  digest(code: string): string { return createHmac('sha256', this.config.getOrThrow<string>('ENTRY_CODE_SECRET')).update(code).digest('hex'); }
  matches(code: string, digest: string): boolean {
    const actual = Buffer.from(this.digest(code), 'hex'); const expected = Buffer.from(digest, 'hex');
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }
}

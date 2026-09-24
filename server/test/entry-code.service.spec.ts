import { ConfigService } from '@nestjs/config';
import { EntryCodeService } from '../src/registrations/entry-code.service';

describe('EntryCodeService', () => {
  const config = { getOrThrow: () => 'this-is-a-test-secret-with-32-characters' } as unknown as ConfigService;
  const service = new EntryCodeService(config);

  it('generates a stable user-friendly code bound to registration', () => {
    const code = service.generate('registration-1');
    expect(code).toMatch(/^HMR-[A-Z2-9]{8}$/);
    expect(service.generate('registration-1')).toBe(code);
    expect(service.generate('registration-2')).not.toBe(code);
  });

  it('matches only the correct code digest', () => {
    const code = service.generate('registration-1');
    expect(service.matches(code, service.digest(code))).toBe(true);
    expect(service.matches('HMR-AAAAAAAA', service.digest(code))).toBe(false);
  });
});

import { validateEnvironment } from '../src/config/environment';

describe('validateEnvironment', () => {
  const valid = { DATABASE_URL: 'postgres://db', REDIS_URL: 'redis://cache', TELEGRAM_BOT_TOKEN: 'token', ENTRY_CODE_SECRET: 'a'.repeat(32), PAYSTACK_SECRET_KEY: 'sk_test_value', PAYSTACK_BASE_URL: 'https://api.paystack.co', ADMIN_API_KEY: 'admin-key-at-least-24-characters' };
  it('applies runtime defaults', () => expect(validateEnvironment(valid)).toMatchObject({ NODE_ENV: 'development', PORT: 3000 }));
  it('rejects short secrets', () => expect(() => validateEnvironment({ ...valid, ENTRY_CODE_SECRET: 'short' })).toThrow());
  it('rejects short admin keys', () => expect(() => validateEnvironment({ ...valid, ADMIN_API_KEY: 'short' })).toThrow());
});

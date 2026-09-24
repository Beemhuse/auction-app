export type Environment = {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  TELEGRAM_BOT_TOKEN: string;
  ENTRY_CODE_SECRET: string;
  PAYSTACK_SECRET_KEY: string;
  PAYSTACK_BASE_URL: string;
  TELEGRAM_BOT_ENABLED: string;
  MINI_APP_URL: string;
  CORS_ORIGINS: string;
  ADMIN_API_KEY: string;
};

export function validateEnvironment(input: Record<string, unknown>): Environment {
  const required = [
    'DATABASE_URL', 'REDIS_URL', 'TELEGRAM_BOT_TOKEN', 'ENTRY_CODE_SECRET',
    'PAYSTACK_SECRET_KEY', 'PAYSTACK_BASE_URL', 'ADMIN_API_KEY',
  ] as const;
  for (const key of required) {
    if (typeof input[key] !== 'string' || input[key] === '') throw new Error(`Missing environment variable: ${key}`);
  }
  if (String(input.ENTRY_CODE_SECRET).length < 32) {
    throw new Error('ENTRY_CODE_SECRET must be at least 32 characters');
  }
  if (String(input.ADMIN_API_KEY).length < 24) {
    throw new Error('ADMIN_API_KEY must be at least 24 characters');
  }
  return {
    NODE_ENV: String(input.NODE_ENV ?? 'development'),
    PORT: Number(input.PORT ?? 3000),
    DATABASE_URL: String(input.DATABASE_URL),
    REDIS_URL: String(input.REDIS_URL),
    TELEGRAM_BOT_TOKEN: String(input.TELEGRAM_BOT_TOKEN),
    ENTRY_CODE_SECRET: String(input.ENTRY_CODE_SECRET),
    PAYSTACK_SECRET_KEY: String(input.PAYSTACK_SECRET_KEY),
    PAYSTACK_BASE_URL: String(input.PAYSTACK_BASE_URL),
    TELEGRAM_BOT_ENABLED: String(input.TELEGRAM_BOT_ENABLED ?? 'true'),
    MINI_APP_URL: String(input.MINI_APP_URL ?? ''),
    CORS_ORIGINS: String(input.CORS_ORIGINS ?? ''),
    ADMIN_API_KEY: String(input.ADMIN_API_KEY),
  };
}

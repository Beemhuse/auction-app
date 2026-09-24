// Development only: prints Telegram Mini App initData signed with your bot token, so the app can be
// opened in a normal browser. Usage: node scripts/dev-init-data.mjs [telegramUserId] [firstName]
// Put the output in miniapp/.env as VITE_DEV_INIT_DATA=... and restart `npm run dev`.
// The server accepts it for MAX_AUTH_AGE_SECONDS (1 hour), so regenerate it when it expires.
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';

const env = readFileSync(new URL('../../server/.env', import.meta.url), 'utf8');
const token = env.match(/^TELEGRAM_BOT_TOKEN=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
if (!token) throw new Error('TELEGRAM_BOT_TOKEN not found in server/.env');

const [id = '100000001', firstName = 'Dev'] = process.argv.slice(2);
const params = new URLSearchParams({
  auth_date: String(Math.floor(Date.now() / 1000)),
  query_id: 'dev',
  user: JSON.stringify({ id: Number(id), first_name: firstName, username: `dev_${id}` }),
});
const checkString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}=${v}`).join('\n');
const secret = createHmac('sha256', 'WebAppData').update(token).digest();
params.set('hash', createHmac('sha256', secret).update(checkString).digest('hex'));
console.log(params.toString());

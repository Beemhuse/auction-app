# Project Hammer TypeScript Client

Generated from the running API's OpenAPI v1 contract using `@hey-api/openapi-ts`. Files under `src/` are generated and must not be edited manually.

## Generate and verify

Start the API, then run from `server/`:

```powershell
npm run client:generate
npm run client:check
```

## Usage

```ts
import { client, listAuctions, placeBid } from '@project-hammer/api-client';

client.setConfig({ baseUrl: 'http://localhost:3010' });

const { data: auctions, error } = await listAuctions();
if (error) throw error;

const result = await placeBid({
  headers: { 'x-telegram-init-data': telegramInitData },
  body: {
    auctionId: auctions[0].id,
    requestId: crypto.randomUUID(),
    amountMinor: 105000,
  },
});
```

Telegram-authenticated operations require the original Mini App `initData` string in `x-telegram-init-data`. The payment webhook method is intended for provider adapters and requires `x-hammer-signature`, not browser clients.

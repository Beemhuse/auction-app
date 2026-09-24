# Project Hammer Server

NestJS/Fastify backend for the Telegram auction MVP. Product HTTP APIs are versioned under `/api/v1`; health is available at `/api/health`. Swagger UI is exposed at `/docs` outside production. The default port is `3000`; this workspace currently uses `3010` in its ignored local `.env` because port `3000` is occupied.

## Prerequisites

- Node.js 22 or newer
- Docker with Compose. Local PostgreSQL is published on host port `5436` to avoid common development port conflicts.
- A Telegram bot token

## Local setup

```powershell
Copy-Item .env.example .env
docker compose up -d
npm install
npm run migration:run
npm run start:dev
```

Replace all placeholder secrets in `.env`. The entry-code and payment webhook secrets must each contain at least 32 characters.
Fastify does not trust forwarded headers by default. Configure an explicit trusted proxy address or function at deployment time if the service runs behind a known reverse proxy; do not enable unrestricted proxy trust.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | Run the API in watch mode |
| `npm run build` | Compile the production bundle |
| `npm run typecheck` | Check strict TypeScript types |
| `npm test` | Run unit tests |
| `npm run migration:run` | Apply PostgreSQL migrations |
| `npm run schema:check` | Verify entity column mappings against the live database |
| `npm run client:generate` | Regenerate the TypeScript SDK from the running OpenAPI v1 document |
| `npm run client:check` | Type-check the generated SDK |

## API v1 flow

1. `GET /api/v1/auctions` lists available auctions.
2. `POST /api/v1/registrations` creates a registration and checkout URL. Authenticated routes require Telegram Mini App `initData` in `x-telegram-init-data`.
3. Paystack initializes checkout server-side using the registration email and deposit amount in currency minor units.
4. `POST /api/v1/payments/webhooks/paystack` verifies Paystack's HMAC-SHA512 `x-paystack-signature` over the raw body.
5. A verified deposit is recorded and its one-time entry code is sent privately by the Telegram bot.
6. `POST /api/v1/registrations/redeem` consumes the code once and returns a signed room token. Later, `POST /api/v1/registrations/room-token` re-issues a token to an already admitted bidder. `GET /api/v1/registrations/mine` lists the caller's registrations and whether they are admitted.
7. Connect to `/ws/v1/auctions?token=<roomToken>` for version 1 room events.
8. `GET /api/v1/bids/state` returns the live price, next minimum, end time (including extensions), and whether the caller leads. `POST /api/v1/bids` submits an exact integer minor-unit amount and UUID request ID. Both authenticate with `Authorization: Bearer <roomToken>`, not `initData`, because Mini App `initData` goes stale during a session. Accepted bids are broadcast across API instances through Redis Pub/Sub.

Room tokens last until the auction's latest possible end: the scheduled end plus the 15-minute soft-close cap, plus 5 minutes of grace. A bid in the final minute extends the end to one minute from now, and the extended end is saved to `auctions.effective_ends_at`. The opening bid may equal the starting price; each later bid must beat the leader by at least the minimum increment.

Telegram `initData` is accepted for one hour (`MAX_AUTH_AGE_SECONDS`). Set `MINI_APP_URL` to the Mini App's https URL; the bot then sets its menu button and adds an **Enter auction** button to entry-code messages. See [miniapp/README.md](../miniapp/README.md).

Every WebSocket message has this envelope:

```json
{
  "version": 1,
  "event": "bid.accepted",
  "eventId": "uuid",
  "timestamp": "2026-09-22T12:00:00.000Z",
  "auctionId": "uuid",
  "payload": {}
}
```

Set `PAYSTACK_SECRET_KEY` to a Paystack test secret for local/staging checkout. Configure the Paystack dashboard webhook URL as `https://<public-api-host>/api/v1/payments/webhooks/paystack`; localhost cannot receive Paystack webhooks.

### Local Paystack webhook

Keep the API running on port `3010`, then expose it in another terminal:

```powershell
ngrok http 3010
```

Use the HTTPS forwarding host shown by ngrok for the Paystack dashboard webhook setting:

```text
Paystack webhook URL: https://<ngrok-host>/api/v1/payments/webhooks/paystack
```

Only a valid signed `charge.success` webhook changes a deposit to `HELD` and triggers Telegram code delivery. No callback or browser return route participates in confirmation.

### Returning to Telegram after checkout

There is no callback URL to configure. When the server creates a checkout, it sets Paystack's `callback_url` to a deep link into the bot, `https://t.me/<bot_username>?start=paid_<reference>`. It gets the bot username from `getMe` using `TELEGRAM_BOT_TOKEN`. A per-transaction `callback_url` overrides the Callback URL saved in the Paystack dashboard, so the dashboard value is ignored and can be left empty.

After paying, the payer lands back in the bot chat. `/start paid_<reference>` is read-only: the bot checks that the reference belongs to the sender and reports the deposit status. It shows the entry code only if the webhook has already confirmed the deposit. Otherwise it says the code will arrive shortly.

## OpenAPI client

The versioned OpenAPI JSON document is available at `/docs-json`. A generated Fetch-based TypeScript SDK lives in `clients/typescript`; its [README](clients/typescript/README.md) includes configuration and usage examples. Generated source is committed so Mini App and admin development can consume the same reviewed contract without requiring a running generator.

## Architecture

- PostgreSQL is the durable source of truth for auctions, registrations, payment events, and accepted bids.
- Redis is the ordering authority during a live auction. A Lua script validates and mutates bid state atomically.
- Nest controllers own transport concerns. Injectable services own authentication, payment, registration, and bidding behavior.
- Monetary values are integer minor units; currency is always explicit.
- API major version and package/release versions evolve independently.

## Current implementation boundary

This slice implements the API foundation, auction catalog, Telegram Mini App authentication, deposit registration, idempotent signed webhook handling, one-time entry redemption, and atomic bid placement. Telegram bot presentation, WebSocket fan-out, outbox delivery, settlement/refunds, admin UI, and production observability remain in the project backlog.

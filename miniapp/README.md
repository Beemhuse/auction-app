# Project Hammer Mini App

The Telegram Mini App bidders use to register, enter their code, and bid live. It uses the same stack as the admin: React 19, Vite, React Router, TanStack Query, and Zod with react-hook-form.

## How bidders use it

1. Open the bot. Tap **Auctions** (the menu button) or **Enter auction** (on the entry-code message).
2. Pick an auction and pay the deposit. Paystack opens outside Telegram and returns you to the bot chat.
3. When the webhook confirms the payment, the bot sends your entry code. Enter it once in the Mini App.
4. Bid in the live room: current price, countdown, quick-bid amounts, and a live feed. Reopening the app later takes you straight back in, without the code.

## Running it locally

Telegram only opens Mini Apps over **https**, so development goes through ngrok. The Vite dev server proxies `/api` and `/ws` to the API. One tunnel to the Mini App therefore serves the app, the API, and the Paystack webhook.

```bash
npm install
npm run dev                  # http://localhost:5180
ngrok http 5180              # in another terminal
```

Then:

1. In `server/.env`, set `MINI_APP_URL=https://<ngrok-host>/` and restart the API. On startup the bot points its **menu button** at this URL, and entry-code messages get an **Enter auction** button.
2. In Paystack (test mode), set the Webhook URL to `https://<ngrok-host>/api/v1/payments/webhooks/paystack`. It now goes through the Mini App's dev server, so keep `npm run dev` running.
3. Open the bot in Telegram and tap **Auctions**.

The free ngrok address changes on every restart. When it does, repeat steps 1 and 2.

### Testing in a normal browser

Outside Telegram there is no signed identity, so the app shows "Open this in Telegram". For browser testing, generate signed `initData` with your bot token:

```bash
node scripts/dev-init-data.mjs 100000001 Ada     # Telegram user id, first name
```

Put the output in `miniapp/.env` as `VITE_DEV_INIT_DATA=...` and restart `npm run dev`. It is used only in development and expires after an hour, the server's `MAX_AUTH_AGE_SECONDS`.

## Deploying

```bash
VITE_API_URL=https://api.example.com VITE_BASE_PATH=/auction/ npm run build
```

Serve `dist/` over https at that path. Set `MINI_APP_URL` to the public URL. Add the Mini App's origin to the server's `CORS_ORIGINS`.

## Structure

```
src/
  app/        router, providers, QueryClient
  pages/      AuctionsPage (catalog), AuctionPage (register -> code -> room), fallbacks
  features/
    auctions/       catalog queries, cards, facts
    registrations/  my registrations, checkout, code redemption, room access
    room/           live state + WebSocket (useLiveRoom), countdown, price board, bid panel, feed
  components/ui/ shared primitives
  lib/        Telegram WebApp wrapper, API client, money and formatting, query keys
```

## How authentication works

- **Telegram `initData`** is sent as `x-telegram-init-data` on catalog, registration, and redemption calls. It is signed by Telegram when the app opens and never refreshes, so the server accepts it for an hour.
- **Room token.** Redeeming the code, or calling `POST /registrations/room-token` later, returns a signed token bound to one user and one auction. It authenticates the WebSocket (`?token=`), `GET /bids/state`, and `POST /bids` (`Authorization: Bearer`). It lasts until the latest possible soft-close end, so a long session never loses access mid-auction.

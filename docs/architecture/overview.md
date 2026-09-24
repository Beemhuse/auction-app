# Backend Architecture

## Runtime boundaries

- **NestJS/Fastify API:** exposes `/api/v1`, validates DTOs, authenticates Telegram users, and hosts the WebSocket gateway at `/ws/v1/auctions`.
- **PostgreSQL:** durable source of truth for auctions, registrations, payment events, and accepted bids. Schema changes use explicit migrations.
- **Redis:** coordinates live auction state, idempotent bid request IDs, atomic ordering, soft-close timing, and cross-instance room broadcasts.
- **Payment adapter:** the initial provider-neutral webhook contract verifies HMAC-SHA256 over the unmodified request body. A provider-specific adapter must map real events into this contract.
- **Telegram delivery:** the current webhook response exposes the generated code as a development handoff. Production delivery must use a durable outbox and send it privately through the bot.

## Core flow

```text
Telegram initData -> registration -> external checkout
                                      |
signed webhook -> HELD deposit -> one-time code
                                      |
code redemption -> signed room token -> WebSocket room
                                      |
bid request -> Redis Lua decision -> PostgreSQL bid -> Redis broadcast
```

## Invariants

- Money is represented as integer minor units with an explicit ISO currency.
- A Telegram user has at most one registration per auction.
- Payment provider event IDs, payment references, bid request IDs, and auction bid sequences are unique.
- Only a verified successful deposit can transition a registration to `HELD` and issue an entry code.
- Entry codes are stored only as keyed digests and are consumed transactionally.
- Telegram identity always comes from verified `initData`, never request payload fields.
- Live bid validation and mutation occur in one Redis script using server time and sequence ordering.
- Product HTTP routes use URI major version `v1`; WebSocket envelopes contain numeric `version: 1`.

## Known boundary

Bid persistence currently follows a successful Redis decision synchronously. Before production, replace this with a durable Redis Stream or transactional outbox consumer so database downtime cannot strand an accepted live bid. This is tracked by HAM-013 in the project plan.

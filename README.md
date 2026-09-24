# Project Hammer

Project Hammer is a deposit-gated Telegram auction platform. The current implementation is a NestJS/Fastify backend vertical slice with PostgreSQL durability, Redis live bid ordering, Telegram Mini App authentication, payment webhook verification, one-time room admission, and versioned WebSocket events.

## Repository

| Path | Contents |
| --- | --- |
| `server/` | NestJS/Fastify API and live auction backend |
| `admin/` | React/Vite operations dashboard (see [admin/README.md](admin/README.md)) |
| `miniapp/` | Telegram Mini App for registration, code entry, and live bidding (see [miniapp/README.md](miniapp/README.md)) |
| `docs/github-project-plan.md` | Issue-ready MVP delivery backlog |
| `docs/architecture/overview.md` | Runtime architecture and key invariants |
| `docs/adr/` | Architecture decision records |

See [server/README.md](server/README.md) for local setup, commands, and the implemented API flow.

## Status

Implemented: API v1 foundation, auction catalog, Telegram HMAC authentication, registration checkout handoff, signed/idempotent deposit webhook, one-time code redemption, signed room tokens, atomic Redis bidding, soft-close timing, PostgreSQL bid persistence, and Redis WebSocket fan-out.

Next delivery slices: Telegram bot UI, durable bid outbox/replay, auction closing, winner settlement, loser refunds, admin operations, and production telemetry.

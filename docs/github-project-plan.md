# Project Hammer: GitHub Project Plan

**Product:** Telegram Auction Engine  
**Release:** MVP (PRD v1.2)  
**Target:** Q4 2026  
**Stack:** Node.js, TypeScript, NestJS, and Fastify  
**Primary clients:** Telegram Bot and Telegram Mini App

### Versioning Policy

- The initial public API version is `v1`; REST endpoints are served under `/api/v1` using NestJS URI versioning.
- Health and internal infrastructure endpoints may remain unversioned when they are not part of the product API.
- WebSocket messages use a versioned envelope with `version: 1`, event name, event ID, timestamp, and payload.
- Breaking request, response, authentication, or event-schema changes require a new major API version. Additive backward-compatible changes remain in `v1`.
- OpenAPI documents and client-facing examples must identify the API version they describe.
- Deprecations must include a replacement path, announced removal date, and telemetry showing remaining usage before removal.

## Project Conventions

Each issue below is ready to copy into GitHub. Keep the issue ID prefix in the title so dependencies remain easy to track after import.

### Labels

| Label | Purpose |
| --- | --- |
| `type:feature` | New product behavior |
| `type:chore` | Foundation or maintenance work |
| `type:test` | Test infrastructure or coverage |
| `area:platform` | Repository, runtime, and shared tooling |
| `area:data` | PostgreSQL schema and persistence |
| `area:redis` | Redis state, locking, and queues |
| `area:telegram` | Bot and Mini App integration |
| `area:payments` | Checkout, webhooks, ledger, and refunds |
| `area:bidding` | Auction room and bid lifecycle |
| `area:admin` | Internal operations interface |
| `area:observability` | Metrics, logs, tracing, and alerts |
| `priority:p0` | Required for a safe MVP launch |
| `priority:p1` | Required for a complete MVP |
| `security` | Authentication, authorization, or sensitive data |
| `concurrency` | Ordering, locking, or idempotency concerns |

### Definition of Done

- Acceptance criteria and tests pass in CI.
- API and event contracts are documented alongside the implementation.
- Public REST routes use `/api/v1`, WebSocket messages use the version 1 envelope, and generated documentation matches runtime behavior.
- Sensitive values are loaded from environment configuration and never logged.
- State-changing operations are authenticated, authorized, idempotent where applicable, and audit logged.
- Database migrations include a tested rollback or documented forward-fix strategy.
- Operational metrics and actionable error logs exist for critical flows.
- No unresolved P0 defect remains in the changed flow.

## Milestones

| Milestone | Objective | Exit criteria |
| --- | --- | --- |
| Sprint 0: Foundation | Establish the deployable platform, persistence model, and shared infrastructure. | CI passes; local services boot; migrations run; Redis and PostgreSQL health checks pass. |
| MVP 1: Telegram Entry + Deposit Gate | Let a Telegram user discover an auction, pay a deposit, and enter one gated room. | A verified payment produces one usable code bound to the payer's Telegram ID; duplicate payment notifications are harmless. |
| MVP 2: Live Bidding Engine | Deliver ordered, low-latency bidding with synchronized room state and anti-sniping. | Concurrent bid tests preserve one canonical leader; accepted bids persist and broadcast; soft-close rules hold. |
| MVP 3: Settlement + Refunds | Close auctions, invoice winners, refund losers, and handle defaults. | Winner and loser ledger states reconcile; refunds are queued within 120 minutes; default fallback is auditable. |
| MVP 4: Admin/Ops Readiness | Give operators visibility and controls needed to launch and support the MVP. | Authorized staff can inspect the complete auction lifecycle; KPI dashboards and critical alerts are active. |

## Dependency Map

```text
HAM-001 -> HAM-002, HAM-003, HAM-022
HAM-002 -> HAM-004, HAM-005, HAM-006, HAM-007, HAM-009
HAM-003 -> HAM-009, HAM-010, HAM-011
HAM-004 -> HAM-005
HAM-005 -> HAM-006
HAM-006 -> HAM-007
HAM-007 + HAM-008 -> HAM-009
HAM-009 + HAM-010 -> HAM-011
HAM-011 -> HAM-012, HAM-013, HAM-014
HAM-012 + HAM-013 + HAM-014 -> HAM-015
HAM-015 -> HAM-016, HAM-017, HAM-018
HAM-002 + lifecycle issues -> HAM-019, HAM-020, HAM-021
HAM-022 -> all externally exposed API and event issues
```

## Sprint 0: Foundation

### HAM-001: Set up NestJS/Fastify TypeScript monorepo foundation

**Labels:** `type:chore`, `area:platform`, `priority:p0`  
**User story / context:** As the delivery team, we need one consistent workspace for the API, Telegram bot, Mini App, admin app, workers, and shared packages so features can be built and deployed independently without duplicating contracts.

**Acceptance criteria**

- A workspace package manager, Node LTS version, NestJS version, and Fastify version are pinned.
- NestJS applications exist for `api`, `bot`, and `worker`; workspaces also exist for `mini-app`, `admin`, and shared `contracts`, `config`, and `testing` libraries.
- The API bootstraps with `@nestjs/platform-fastify`; no Express-only middleware or request APIs are used.
- Nest URI versioning is enabled with `v1` as the initial API version and `/api` as the global prefix, producing routes under `/api/v1`.
- TypeScript strict mode, linting, formatting, unit tests, and build commands run from the repository root.
- Global Nest validation uses DTOs with transformation, whitelisting, and rejection of unknown properties at trust boundaries.
- Environment variables are schema validated at startup; `.env.example` contains names and descriptions but no secrets.
- Local PostgreSQL and Redis dependencies can be started reproducibly.
- CI installs dependencies, type-checks, lints, tests, and builds all affected workspaces.

**Implementation notes**

- Use a NestJS monorepo or package-workspace layout with shared TypeScript and lint configuration; preserve clear application boundaries either way.
- Organize backend behavior into bounded Nest modules such as `AuctionsModule`, `RegistrationsModule`, `PaymentsModule`, `BiddingModule`, and `SettlementModule`.
- Keep applications independently deployable. Share transport-neutral DTO/event contracts, configuration utilities, and test fixtures, but do not expose persistence entities across module boundaries.
- Use dependency-injection tokens for payment, queue, clock, and persistence adapters so critical flows can be tested without external services.
- Configure Fastify security headers, CORS allowlists, body-size limits, request IDs, graceful shutdown, and readiness/liveness endpoints during bootstrap.
- Configure Nest Swagger from annotated DTOs and controllers so `/docs` exposes the `v1` OpenAPI contract outside production, with production access controlled explicitly.

**Test requirements**

- Add a CI smoke test that starts the Nest API through the Fastify adapter and verifies its health endpoint using Fastify injection.
- Verify a clean checkout can install and run all validation commands.
- Verify version-neutral controllers are limited to explicitly approved infrastructure endpoints.

### HAM-022: Establish API versioning and project documentation

**Labels:** `type:chore`, `area:platform`, `priority:p0`  
**User story / context:** As an engineer or integrator, I need accurate, versioned documentation so I can run, integrate with, operate, and evolve Project Hammer without relying on tribal knowledge.

**Acceptance criteria**

- NestJS URI versioning is configured and all MVP product endpoints are exposed under `/api/v1`.
- A generated OpenAPI 3 document describes every `v1` REST endpoint, authentication requirement, request DTO, response DTO, status code, and representative error.
- Swagger UI is available in non-production environments; production exposure is disabled or protected by explicit configuration.
- WebSocket protocol documentation defines the version 1 envelope, connection authentication, snapshots, bid acknowledgments, room events, errors, ordering, reconnection, and resynchronization.
- The repository includes a root README with prerequisites, installation, environment setup, local infrastructure, migrations, development commands, tests, builds, and application entry points.
- Architecture documentation describes service boundaries, PostgreSQL and Redis ownership, payment flow, bid ordering, settlement flow, and key failure-recovery paths.
- Operational runbooks cover failed webhooks, bid persistence lag, stuck auction closure, refund failures, reconciliation, and safe worker replay.
- Architecture decisions with lasting impact are recorded as short ADRs, beginning with NestJS/Fastify, live-state durability, payment idempotency, and API versioning.
- API and event examples contain no real credentials, payment data, entry codes, or personal information.

**Implementation notes**

- Generate OpenAPI from Nest controllers and DTO decorators so documentation stays close to executable contracts.
- Commit a deterministic OpenAPI artifact for review and client generation, and fail CI when regenerated output differs.
- Use semantic versioning for independently published packages and deployment releases; API major versions remain independent from package versions.
- Keep documentation close to its owner: API details beside controllers/DTOs, architectural guidance under `docs/architecture`, ADRs under `docs/adr`, and runbooks under `docs/runbooks`.

**Test requirements**

- Add a contract test asserting all public product routes begin with `/api/v1`.
- Validate the generated OpenAPI document in CI and verify each registered `v1` route appears in it.
- Validate WebSocket version fields and reject unsupported major versions with a stable error.
- Run documented setup and core commands from a clean checkout as a release-readiness check.

### HAM-002: Define PostgreSQL schema for auctions, registrations, bids, and ledger events

**Labels:** `type:feature`, `area:data`, `priority:p0`  
**User story / context:** As the platform, we need a durable system of record for auction state and money-related transitions so every outcome can be reconstructed and reconciled.

**Acceptance criteria**

- Migrations define auctions, registrations, bids, ledger events, payment events, and settlement records.
- Auction status supports at least `SCHEDULED`, `ACTIVE`, and `CLOSED` with validated start and end times.
- A registration is unique per auction and Telegram user; payment references and entry codes are unique.
- Deposit state supports `HELD`, `APPLIED`, `REFUNDED`, and `FORFEIT`.
- Bids store auction, Telegram user, amount, acceptance sequence, and server timestamp.
- Monetary values use fixed-precision numeric columns and include currency.
- Ledger events are append-only and carry an idempotency key, external reference, amount, type, timestamp, and metadata.

**Implementation notes**

- Preserve the PRD entities while adding explicit currency and ledger history needed for payment reconciliation.
- Use database constraints for invariants that must survive application bugs.
- Index auction status/time, registration lookup, accepted bid ordering, and unprocessed payment events.

**Test requirements**

- Run migrations up on an empty database in integration tests.
- Test uniqueness, state constraints, precision, and ordering indexes with representative records.

### HAM-003: Add Redis integration for bid state, locks, and auction room cache

**Labels:** `type:feature`, `area:redis`, `concurrency`, `priority:p0`  
**User story / context:** As the bidding service, we need fast shared state and atomic operations so all instances agree on the current leader, timer, and room membership.

**Acceptance criteria**

- Redis connection lifecycle, namespaced keys, health checks, and reconnect behavior are implemented.
- Key schemas cover current bid, accepted sequence, auction end time, registration redemption, room presence, and background jobs.
- Auction keys expire after a configurable retention period beyond auction close.
- Atomic operations are implemented as versioned scripts or transactions with typed wrappers.
- The service fails closed for state-changing auction operations when Redis is unavailable.

**Implementation notes**

- Do not use a long-lived distributed lock around the full request; make validation and mutation one atomic Redis operation.
- Keep Redis authoritative only for live coordination. PostgreSQL remains the durable record.

**Test requirements**

- Integration-test key expiry, reconnect behavior, script loading, and atomic mutation.
- Verify separate service instances observe the same canonical state.

## MVP 1: Telegram Entry + Deposit Gate

### HAM-004: Implement Telegram bot `/start` discovery catalog

**Labels:** `type:feature`, `area:telegram`, `priority:p1`  
**User story / context:** As a Telegram user, I want to discover upcoming auctions in chat so I can understand the terms and register without leaving Telegram unnecessarily.

**Acceptance criteria**

- `/start` identifies the Telegram user and returns active or upcoming auctions.
- Every auction card shows title, start time, starting price, minimum increment, reserve disclosure policy, and deposit amount.
- Each available auction has a Register action that carries an opaque auction identifier.
- Empty, unavailable, and transient error states have useful user-facing responses.
- Bot handlers do not expose internal IDs, secrets, or payment references in logs.

**Implementation notes**

- Fetch catalog data through the Core API rather than reading the database from the bot.
- Use Telegram deep links or callback data within platform size limits.

**Test requirements**

- Unit-test command and callback routing.
- Integration-test catalog rendering, pagination if needed, empty state, and stale auction selection.

### HAM-005: Implement auction registration checkout initiation

**Labels:** `type:feature`, `area:payments`, `area:telegram`, `priority:p0`  
**User story / context:** As a bidder, I want to pay the required deposit through a secure checkout so I can qualify for the private auction room.

**Acceptance criteria**

- Registration validates that the auction accepts registrations and that cutoff time has not passed.
- The API creates or reuses one pending registration for the auction and Telegram user.
- Checkout metadata includes immutable internal registration and auction references.
- Repeated Register actions reuse an open checkout or safely create a replacement without duplicate held deposits.
- Success and cancellation return paths lead back to Telegram or the Mini App.
- Provider credentials and webhook secrets are environment configured.

**Implementation notes**

- Define a provider interface supporting Stripe first and a local gateway adapter later.
- Do not mark a deposit held from a browser redirect; only a verified webhook may do so.

**Test requirements**

- Unit-test registration eligibility and checkout request mapping.
- Integration-test repeat initiation, registration cutoff, provider errors, and successful session creation.

### HAM-006: Implement payment webhook idempotency and deposit-held state

**Labels:** `type:feature`, `area:payments`, `security`, `priority:p0`  
**User story / context:** As the platform, we need to process payment notifications exactly once in effect so retries or forged requests cannot create duplicate deposits or access codes.

**Acceptance criteria**

- The endpoint verifies the provider signature against the raw request body before processing.
- Each provider event is durably recorded under a unique event ID before side effects are committed.
- A successful deposit transitions the registration to `HELD` and appends a balanced ledger event.
- Duplicate and out-of-order events return successful acknowledgements without repeating side effects.
- Unknown references and amount/currency mismatches are quarantined for review.
- A reconciler polls unsettled registrations at least every 60 seconds and uses the same idempotent transition.

**Implementation notes**

- Commit payment event, registration transition, and ledger event in one database transaction.
- Enable raw-body capture only for signed webhook routes using a Fastify-compatible Nest configuration; do not parse and reserialize payloads before signature verification.
- Implement provider handlers as Nest controllers backed by payment application services rather than placing business logic in route handlers.
- Keep provider payloads redacted according to data retention policy.

**Test requirements**

- Test valid, invalid-signature, duplicate, reordered, mismatched, and unknown-reference events.
- Test reconciler recovery after a missed webhook.

### HAM-007: Generate and persist one-time auction entry codes

**Labels:** `type:feature`, `area:telegram`, `security`, `priority:p0`  
**User story / context:** As a paid registrant, I want a short entry code delivered privately so only my Telegram account can unlock the auction room.

**Acceptance criteria**

- A code is generated only after the registration reaches `HELD`.
- The code is eight user-friendly alphanumeric characters, displayed in the `HMR-XXXX` product format or an equivalently sized documented format.
- The code is cryptographically derived or generated, collision checked, and uniquely bound to auction and Telegram user.
- Only a non-reversible code digest is stored; comparisons are constant-time where applicable.
- Generation is idempotent and concurrent requests return the same active registration result.
- The code expires when the auction ends and is sent only to the bound Telegram user.

**Implementation notes**

- The PRD suggests truncated HMAC-SHA256. Include sufficient entropy and retry on a uniqueness conflict.
- Never emit a plaintext code to application logs, traces, or analytics.

**Test requirements**

- Unit-test format, deterministic binding if used, collision retry, and expiry.
- Integration-test concurrent generation and duplicate payment delivery.

### HAM-008: Validate Telegram Mini App `initData` HMAC

**Labels:** `type:feature`, `area:telegram`, `security`, `priority:p0`  
**User story / context:** As the platform, we need to authenticate Mini App requests from Telegram so a user cannot impersonate another bidder by changing client data.

**Acceptance criteria**

- Validation follows Telegram's canonical data-check-string and HMAC algorithm.
- Hash comparison is timing safe.
- `auth_date` has a configurable maximum age and future timestamps beyond clock tolerance are rejected.
- The validated Telegram user ID becomes the request identity; client-supplied user IDs are ignored.
- Invalid, expired, malformed, and replay-risk requests receive consistent unauthorized responses without leaking details.

**Implementation notes**

- Centralize validation in a Nest authentication service used by HTTP guards and WebSocket handshake guards.
- Keep raw `initData` and bot token out of logs.

**Test requirements**

- Use known valid vectors and tests for changed fields, invalid hashes, expired dates, malformed encoding, and clock skew.

### HAM-009: Implement gated auction room entry and code redemption

**Labels:** `type:feature`, `area:telegram`, `area:redis`, `security`, `concurrency`, `priority:p0`  
**User story / context:** As a qualified bidder, I want to redeem my code once and enter the correct room while preventing another session from taking over my registration.

**Acceptance criteria**

- Entry requires valid Telegram `initData`, matching Telegram identity, auction ID, and active entry code.
- Redemption atomically changes an unused registration to redeemed and creates a room session expiring at auction end.
- Simultaneous redemption attempts result in one active session.
- A documented reconnect policy allows the same authenticated user to recover their session without enabling concurrent takeover.
- Used, expired, mismatched, unpaid, and closed-auction codes are rejected with stable error codes.
- Successful and rejected redemption attempts are audit logged without plaintext codes.

**Implementation notes**

- Back the active-session claim with an atomic Redis operation and durably record first redemption in PostgreSQL.
- Bind room tokens to user, auction, and a revocable session identifier.

**Test requirements**

- Integration-test valid entry and every rejection state.
- Add a concurrency test proving only one of simultaneous first redemptions succeeds.

## MVP 2: Live Bidding Engine

### HAM-010: Implement WebSocket auction room hub

**Labels:** `type:feature`, `area:bidding`, `area:redis`, `priority:p0`  
**User story / context:** As an admitted bidder, I want a live connection to the auction room so I receive authoritative price, leader, and timer updates with low latency.

**Acceptance criteria**

- The WebSocket handshake authenticates a valid room session and authorizes its auction.
- On connection, the client receives a versioned snapshot containing auction state, current amount, minimum next bid, and server end time.
- Heartbeat, reconnect, stale-client, and graceful shutdown behavior are implemented.
- Multiple hub instances distribute messages through Redis Pub/Sub or Streams.
- Per-user connection limits and message rate limits protect the room.
- Clients cannot subscribe to or publish into an unauthorized auction.

**Implementation notes**

- Send absolute server timestamps so clients render countdowns without treating local time as authoritative.
- Use versioned event envelopes shared with the Mini App.
- Set the initial WebSocket envelope to `version: 1` and document compatibility and unsupported-version behavior.
- Implement the room boundary as a Nest WebSocket gateway with an explicitly selected adapter compatible with the Fastify deployment; keep authorization and bidding logic in injectable services rather than gateway methods.

**Test requirements**

- Test authentication, initial snapshot, reconnect, unauthorized room access, rate limiting, and cross-instance broadcast.

### HAM-011: Implement atomic bid placement with Redis script

**Labels:** `type:feature`, `area:bidding`, `area:redis`, `concurrency`, `priority:p0`  
**User story / context:** As a bidder, I want my bid evaluated in a single ordered operation so simultaneous requests cannot produce two winners or violate the minimum increment.

**Acceptance criteria**

- Bid input uses an exact minor-unit or fixed-precision representation and includes a client request ID.
- One atomic Redis script validates auction activity, session, current end time, minimum increment, and request idempotency.
- An accepted bid updates leader, amount, sequence, and relevant end time in one operation.
- Rejected bids return a stable reason and the authoritative minimum next bid without mutating state.
- Duplicate request IDs return the original result.
- Server ordering, not client timestamps, determines acceptance and FIFO sequence.

**Implementation notes**

- Treat the Redis script result as the live ordering authority and emit a persistence event for each accepted bid.
- Initialize live Redis state from PostgreSQL through a guarded activation flow.

**Test requirements**

- Unit-test validation and script result mapping.
- Run high-contention tests with simultaneous equal and increasing bids; assert one sequence per accepted bid and one canonical leader.

### HAM-012: Implement soft-close anti-snipe timer reset

**Labels:** `type:feature`, `area:bidding`, `concurrency`, `priority:p0`  
**User story / context:** As a bidder, I want a fair response window after a late high bid so the auction is not decided solely by network timing in its final seconds.

**Acceptance criteria**

- An accepted bid with less than 60 seconds remaining moves the end time to 60 seconds after acceptance.
- Cumulative extension cannot exceed 15 minutes beyond the original scheduled end.
- Timer extension and bid acceptance occur in the same atomic operation.
- A bid at or after the authoritative end time is rejected.
- Extension results include the new authoritative end time and are broadcast to clients.

**Implementation notes**

- Persist original end time separately from effective end time.
- Specify exact boundary behavior in tests, including precisely 60 seconds remaining and the extension cap.

**Test requirements**

- Unit-test all time boundaries with a controlled clock.
- Concurrency-test bids around expiry and at the 15-minute cap.

### HAM-013: Persist accepted bids to PostgreSQL

**Labels:** `type:feature`, `area:bidding`, `area:data`, `priority:p0`  
**User story / context:** As an operator, I need every accepted live bid durably recorded in order so auction results survive process or Redis failures.

**Acceptance criteria**

- Every accepted Redis sequence produces one durable bid record.
- Persistence is idempotent on auction and acceptance sequence.
- Worker retries use bounded exponential backoff and move exhausted records to an inspectable dead-letter state.
- Auction closure is blocked or reconciled while accepted sequences are missing from PostgreSQL.
- Recovery can replay pending accepted bids without changing their original order.

**Implementation notes**

- Use a durable Redis Stream, outbox, or equivalent delivery mechanism; Pub/Sub alone is insufficient for persistence.
- Monitor lag between accepted sequence and highest persisted sequence.

**Test requirements**

- Test duplicate delivery, transient database failure, worker restart, out-of-order delivery, and gap reconciliation.

### HAM-014: Broadcast bid and timer updates to Mini App clients

**Labels:** `type:feature`, `area:bidding`, `area:telegram`, `priority:p1`  
**User story / context:** As a room participant, I want accepted bids and timer changes reflected immediately and consistently so I can make informed bids.

**Acceptance criteria**

- Only accepted bid results are broadcast as room state changes.
- Events include monotonic sequence, current amount, anonymized leader state, minimum next bid, effective end time, and server timestamp.
- Events conform to the documented version 1 WebSocket schema.
- Clients ignore duplicate or older sequences and request a fresh snapshot on a detected gap.
- Bid controls show valid increment choices and disable while the auction is closed or state is resynchronizing.
- The UI presents connection loss and successful reconnection without falsely showing a bid as accepted.

**Implementation notes**

- A bid acknowledgment is distinct from the room broadcast but references the same accepted sequence.
- Avoid exposing Telegram identity to other bidders.

**Test requirements**

- Test duplicate, delayed, and missing event handling in the Mini App.
- End-to-end test two clients bidding and observing synchronized amount and countdown state.

### HAM-015: Close auction and identify winner with FIFO tie-breaking

**Labels:** `type:feature`, `area:bidding`, `area:data`, `concurrency`, `priority:p0`  
**User story / context:** As the platform, we need to close each auction exactly once and select the correct winner from the accepted server-ordered bids.

**Acceptance criteria**

- Closure uses the effective end time and cannot race with an in-flight valid bid.
- One idempotent close operation changes the auction from `ACTIVE` to `CLOSED`.
- The highest accepted bid wins; equal-value ordering uses the earliest server acceptance sequence.
- Reserve-not-met and no-bid outcomes are represented explicitly.
- All accepted sequences are persisted before the result is finalized.
- A final room event publishes the outcome without exposing private payment details.

**Implementation notes**

- Use a short atomic close transition in Redis followed by a transactional durable finalization.
- Reconciliation must safely resume a close interrupted between live-state freeze and database commit.

**Test requirements**

- Test no bids, reserve not met, equal amounts, late bids, duplicate close jobs, persistence gaps, and crash recovery.

## MVP 3: Settlement + Refunds

### HAM-016: Apply winner deposit to final invoice

**Labels:** `type:feature`, `area:payments`, `priority:p0`  
**User story / context:** As the winning bidder, I want my held deposit deducted from the final amount so I am charged only the balance due.

**Acceptance criteria**

- A valid winner produces one settlement with gross bid, deposit credit, balance due, currency, and a 24-hour deadline.
- Applying the deposit transitions it from `HELD` to `APPLIED` through balanced, append-only ledger events.
- Invoice creation and deposit application are idempotent.
- Zero or negative balances are handled without creating an invalid payment request.
- The winner receives private payment instructions and deadline through Telegram.
- Payment confirmation marks the settlement paid and is webhook verified.

**Implementation notes**

- Keep invoice state distinct from auction close state.
- Never mutate historical ledger amounts to correct an error; append compensating events.

**Test requirements**

- Test normal, exact-deposit, over-deposit, duplicate job, provider failure, and payment confirmation paths.

### HAM-017: Queue losing-bidder refunds with rate limiting

**Labels:** `type:feature`, `area:payments`, `area:redis`, `priority:p0`  
**User story / context:** As a non-winning bidder, I want my deposit automatically returned promptly after auction close.

**Acceptance criteria**

- Every eligible losing registration with `HELD` deposit receives one refund job.
- Refund jobs are enqueued promptly enough to meet the PRD requirement of refunds within 120 minutes.
- Provider dispatch is limited to 50 refunds per minute by default and is configurable.
- Successful refunds transition the deposit to `REFUNDED` and append ledger/provider references atomically.
- Transient failures retry with backoff; permanent failures enter an operator-visible state and alert.
- Winner, forfeited, already refunded, and unpaid registrations are never refunded by this flow.

**Implementation notes**

- Track queued, submitted, pending, succeeded, and failed states independently from the ledger's financial state.
- Use provider idempotency keys derived from registration and refund purpose.

**Test requirements**

- Test eligibility, duplicate close events, rate limiting, retries, provider timeouts, permanent failure, and webhook reconciliation.
- Add a timed acceptance test proving a maximum-sized supported auction meets the 120-minute target.

### HAM-018: Handle winner default and offer lot to second bidder

**Labels:** `type:feature`, `area:payments`, `area:bidding`, `priority:p0`  
**User story / context:** As an operator, I want an unpaid winner handled consistently after 24 hours so the deposit is forfeited and the lot can be offered to the next eligible bidder.

**Acceptance criteria**

- An unpaid settlement becomes default-eligible only after its authoritative 24-hour deadline.
- The transition is idempotent and rechecks payment state immediately before forfeiture.
- The winner's deposit changes from `APPLIED` or held settlement state to `FORFEIT` through documented ledger events.
- The next eligible bidder is selected by descending accepted bid amount and FIFO sequence, excluding ineligible/defaulted bidders.
- A new time-bounded offer is created and delivered privately; acceptance and rejection are tracked.
- Exhausting eligible bidders moves the lot to an operator-action state.

**Implementation notes**

- Model offers as explicit records rather than overwriting the original auction winner.
- Clarify legal copy and capture mechanics with the payment provider before production launch.

**Test requirements**

- Test payment at the deadline boundary, duplicate default jobs, second-bidder selection, declined/expired offers, and no eligible fallback.

## MVP 4: Admin/Ops Readiness

### HAM-019: Create admin views for auctions, registrations, bids, and settlement status

**Labels:** `type:feature`, `area:admin`, `priority:p1`  
**User story / context:** As an authorized operator, I need to inspect auctions and their financial lifecycle so I can support users and resolve exceptions.

**Acceptance criteria**

- Nest authentication and role guards protect every admin route and API.
- Auction list and detail views expose schedule, status, live/final result, and effective end time.
- Registration views expose Telegram reference, deposit state, redemption state, and payment/refund status with sensitive fields masked.
- Bid history is ordered by accepted sequence and clearly distinguishes accepted canonical bids.
- Settlement and refund queues expose deadlines, attempts, failures, and provider references.
- Filters and pagination support status, auction, date, and exception state.
- Any operator action requires confirmation, a reason, authorization, and an audit event.

**Implementation notes**

- Begin with read-heavy support workflows; keep manual financial mutations behind explicit service commands.
- Display all financial timestamps and amounts with timezone/currency context.

**Test requirements**

- Test role restrictions, masking, pagination/filtering, empty states, and audit records for operator actions.
- Add an end-to-end test following one auction from registration through settlement and refunds.

### HAM-020: Add audit logging for payment, bid, refund, and settlement events

**Labels:** `type:feature`, `area:observability`, `area:data`, `security`, `priority:p0`  
**User story / context:** As compliance and operations staff, we need a tamper-evident history of sensitive actions so disputes and failures can be reconstructed.

**Acceptance criteria**

- A structured append-only audit record captures actor type/ID, action, target type/ID, outcome, request correlation ID, timestamp, and redacted metadata.
- Payment receipt, code generation/redemption, bid acceptance/rejection, close, invoice, refund, forfeiture, fallback offer, and admin action are covered.
- Audit writes for critical state transitions occur transactionally or through a reliable outbox.
- Plaintext entry codes, credentials, full payment payloads, and unnecessary personal data are excluded.
- Retention, access controls, and export format are documented.

**Implementation notes**

- Separate business ledger entries from security/operations audit events.
- Include enough identifiers to correlate HTTP, WebSocket, worker, database, and provider activity.

**Test requirements**

- Assert required audit events in each critical integration flow.
- Test redaction, authorization, failed-action capture, and reliable delivery after worker restart.

### HAM-021: Add observability for bid latency, default rate, and deposit conversion

**Labels:** `type:feature`, `area:observability`, `priority:p0`  
**User story / context:** As the launch team, we need measurable service health and product KPIs so we can detect incidents and validate the MVP targets.

**Acceptance criteria**

- Metrics cover bid request count/results, end-to-end accepted bid latency, WebSocket connections, persistence lag, queue depth/age, webhook failures, refund failures, and Redis/database errors.
- Product metrics define deposit conversion and winner default rate with explicit numerator, denominator, and time window.
- Dashboards display P50/P95/P99 bid latency and progress against P99 under 250ms, deposit conversion above 85%, and default rate below 1.5%.
- Alerts cover sustained bid latency/error rate, missing bid persistence, auction close failure, webhook backlog, and refunds approaching 120 minutes.
- Logs are structured, correlated, redacted, and do not use high-cardinality user IDs as metric labels.
- Synthetic checks cover health, authenticated room connection, and a non-production bid flow.

**Implementation notes**

- Define bid latency boundaries precisely, from server receipt through authoritative Redis result; track broadcast latency separately.
- Mark KPI dashboards as operational indicators until sample sizes are statistically useful.

**Test requirements**

- Verify metric emission and trace correlation in integration tests.
- Load-test the bid path and record P99 results at an agreed MVP concurrency profile.
- Exercise each critical alert in a non-production environment.

## Cross-Milestone Test Plan

### Unit tests

- Entry code format, entropy/derivation, collision handling, and expiry.
- Telegram Mini App HMAC validation and timestamp policy.
- Bid amount and minimum-increment validation.
- Soft-close boundary and extension-cap calculations.
- Settlement, refund eligibility, and second-bidder ordering.

### Integration tests

- Registration through verified deposit and code delivery.
- Duplicate and out-of-order payment webhooks plus polling reconciliation.
- Entry redemption, session recovery, and concurrent takeover prevention.
- Bid acceptance, durable persistence, broadcast, close, settlement, and refund queueing.
- Provider failures, retries, idempotent recovery, and audit-event completeness.

### Concurrency and resilience tests

- Simultaneous equal and increasing bids against the atomic Redis operation.
- Bids arriving on the close boundary and anti-snipe extension cap.
- Concurrent code generation/redemption and duplicate worker delivery.
- API, worker, Redis, and PostgreSQL interruption at each critical transition.

### MVP acceptance gates

- P99 authoritative bid path is below 250ms at the agreed launch load profile.
- All eligible losing deposits are queued and processed within 120 minutes at the supported maximum auction size.
- A registration can have only one active redeemed room session under concurrent attempts.
- Duplicate provider events and job deliveries produce no duplicate financial effects.
- Auction and ledger reconciliation reports zero unexplained state differences before release.
- The `v1` OpenAPI document and WebSocket protocol pass contract validation and match the deployed interfaces.

## Suggested Delivery Sequence

| Phase | Issues | Demonstrable outcome |
| --- | --- | --- |
| Foundation | HAM-001 to HAM-003, HAM-022 | Services boot with PostgreSQL and Redis; versioned contracts, documentation, and CI are ready. |
| Qualified entry | HAM-004 to HAM-009 | A Telegram user can discover, deposit, receive a code, and enter one room. |
| Live auction | HAM-010 to HAM-015 | Multiple users can bid concurrently and one correct result closes durably. |
| Money completion | HAM-016 to HAM-018 | Winner settlement, loser refunds, and winner default paths reconcile. |
| Launch readiness | HAM-019 to HAM-021 | Operators can support the system and measure launch KPIs. |

## Deferred Beyond MVP

- Telegram Wallet payments.
- Native mobile and standalone web clients.
- CDN or edge-distributed WebSocket infrastructure.
- Multi-tenant seller onboarding and isolation.
- Features not required to prove the deposit-gated Telegram auction workflow.

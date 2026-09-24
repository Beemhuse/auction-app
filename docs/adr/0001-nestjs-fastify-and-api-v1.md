# ADR 0001: NestJS, Fastify, and API v1

**Status:** Accepted  
**Date:** 2026-09-23

## Decision

Use NestJS with `@nestjs/platform-fastify` for backend HTTP services. Product REST routes use Nest URI versioning under `/api/v1`. Live-room events use an independent envelope with `version: 1`.

## Rationale

NestJS provides module boundaries, dependency injection, guards, DTO validation, and generated OpenAPI integration. Fastify provides a low-overhead HTTP runtime and request injection for tests. Explicit transport versions let clients evolve independently from package and deployment versions.

## Consequences

- Express-specific middleware and request APIs are prohibited.
- Signed webhooks require Fastify-compatible raw-body access.
- Breaking transport changes require a new major API or event-envelope version.
- Forwarded headers are not trusted broadly; deployments must configure explicit proxy trust.

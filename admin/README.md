# Project Hammer Admin

Operations dashboard for Project Hammer. Built with React 19, Vite, React Router, TanStack Query, and Zod + react-hook-form. It talks to the `/api/v1/admin` endpoints of the server and authenticates with the `x-admin-key` header (`ADMIN_API_KEY` in `server/.env`).

## Commands

```bash
npm install
npm run dev       # http://localhost:5174, proxies /api to VITE_PROXY_TARGET
npm run build     # production bundle in dist/
npm run preview   # serve the built bundle
```

Copy `.env.example` to `.env` to change settings. Leave `VITE_API_URL` empty in development so requests go through the Vite proxy. Set it to the API origin for a deployed build, and add the admin origin to the server's `CORS_ORIGINS`.

## Routes

| Path | Page |
| --- | --- |
| `/login` | Admin key entry. Redirects back to the page you originally asked for |
| `/` | Totals, live auctions closing soonest, upcoming auctions (overdue ones flagged) |
| `/auctions?q=&status=` | Catalog with filters kept in the URL; create and edit dialogs |
| `/auctions/:auctionId?tab=bids` | Summary, open/close actions, registrations and bid history (refreshed every 5s while active) |

## Structure

```
src/
  app/          router, providers, QueryClient defaults
  pages/        route-level screens that compose features (lazy-loaded, one chunk each)
  features/
    auth/           login form, route guard, login/logout hooks
    auctions/       overview query, create/update mutations, form schema, table, filters, summary
    registrations/  registrations query + table (emails masked by default)
    bids/           bid history query + table
    dashboard/      metrics and watchlist widgets
  components/
    ui/         shared primitives: Button, Modal, DataTable, FormField, Tabs, Toast...
    layout/     app shell with navigation
  lib/          fetch client, admin key session, formatting, money conversion
  styles/
```

Each feature exposes its public API through `index.js`, and pages import only from there. A feature's folders follow `api/` (TanStack Query hooks and keys), `schemas/` (Zod), `components/`, and `hooks/`.

## Conventions

- **Server state lives in TanStack Query.** Query keys come from `features/auctions/api/keys.js`. Mutations invalidate the overview query, which feeds the dashboard, the catalog, and the detail pages. The admin API has no single-auction endpoint, so `useAuction(id)` selects from the cached overview.
- **Zod validates both directions.** Form schemas validate input before submit. Every response is parsed in `apiRequest`, so a server contract change shows up as a clear error, not a broken screen. Unknown fields such as `entryCodeDigest` are stripped before they reach the UI.
- **Money is integer minor units as strings.** `lib/money.js` converts between major and minor units with string arithmetic, so there is no floating-point rounding.
- **Edits send only the changed fields** (`diffAuctionPayload`).
- **A 401 from any request locks the session** and returns you to the login screen.

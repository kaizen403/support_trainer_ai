# Learnings & Issues - Call Center Training Platform

## Auth Implementation
- Using `better-auth` with `organization` plugin.
- Client-side auth via `createAuthClient` in `apps/fe/src/lib/auth-client.ts`.
- Server-side session verification via `getSession` helper.
- Protected routes needed for `/dashboard` and `/settings`.
- Organization creation on signup required explicit handling in register page (creating user first, then organization).

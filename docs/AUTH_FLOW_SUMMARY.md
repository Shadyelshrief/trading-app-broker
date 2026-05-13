# Authentication Flow Summary

This document captures what was shipped for **login**, **forgot password**, and **reset password** in the Angular broker desktop, plus how it behaves in **mock mode** versus a future **real HTTP API**.

---

## Files Changed

### Documentation

- `docs/PROJECT_ANALYSIS.md` — full-stack and architecture survey (frontend-only repo).
- `docs/AUTH_IMPLEMENTATION_PLAN.md` — design and API contracts.
- `docs/AUTH_FLOW_SUMMARY.md` — this file.

### Configuration

- `angular.json` — production `fileReplacements` for `environment.prod.ts`.
- `src/environments/environment.ts` — development defaults (`useMockAuth`, `exposeResetTokenInMock`).
- `src/environments/environment.prod.ts` — production flags (`exposeResetTokenInMock: false`).

### Application wiring

- `src/app/app.config.ts` — `provideHttpClient(withInterceptors([...]))`.
- `src/app/app.routes.ts` — public auth routes + guarded shell route.
- `src/app/app.component.ts` — `RouterOutlet` host instead of hard-coded shell.
- `src/app/app.component.spec.ts` — router-based bootstrap expectations.

### Core authentication

- `src/app/core/auth/auth.models.ts` — DTO interfaces.
- `src/app/core/auth/auth-api.service.ts` — `HttpClient` wrapper for `/api/auth/*`.
- `src/app/core/auth/auth.service.ts` — session persistence + orchestration.
- `src/app/core/auth/auth.guard.ts` — protects the shell route.
- `src/app/core/auth/guest.guard.ts` — prevents revisiting auth screens while signed in.
- `src/app/core/auth/mock-auth.interceptor.ts` — in-browser mock for auth endpoints when `useMockAuth` is true.
- `src/app/core/auth/auth-bearer.interceptor.ts` — attaches bearer tokens for non-auth API calls.
- `src/app/core/auth/auth.service.spec.ts` — session persistence tests with `HttpTestingController`.

### Feature UI

- `src/app/features/auth/auth-pages.scss` — shared auth layout tokens aligned with global design.
- `src/app/features/auth/login/*` — login page.
- `src/app/features/auth/forgot-password/*` — forgot password page.
- `src/app/features/auth/reset-password/*` — reset password page with token validation.

### Shell

- `src/app/core/layout/app-shell.component.ts` — `signOut()` calling `AuthService.logout()`.
- `src/app/core/layout/app-shell.component.html` — header actions + **Sign out** control.
- `src/app/core/layout/app-shell.component.scss` — header action layout styles.

### Shared utilities

- `src/app/shared/utils/http-error.util.ts` — maps `HttpErrorResponse` payloads to user-visible strings.
- `src/app/shared/validation/auth-validators.ts` — email/password/match validators.

---

## Architecture Decisions

1. **Single `HttpClient` surface** — `AuthApiService` always issues the same requests; mock vs real is selected by interceptors and `environment.useMockAuth`, not duplicated services.
2. **Functional interceptors** — matches Angular 17 standalone style used elsewhere in the app.
3. **Functional route guards** — small, composable, and tree-shakable.
4. **Session storage** — access token in `localStorage` under `broker_auth_v1_access_token` for refresh survival; logout clears storage and navigates to `/login`.
5. **Golden Layout untouched** — shell component remains lazy-loaded behind `authGuard` so panel registration logic stays isolated.
6. **Mock reset tokens** — stored in module memory inside `mock-auth.interceptor.ts` with a 15-minute TTL and **one-time** consumption on successful reset.

---

## Security Considerations

- **Passwords are never persisted** client-side; only the access token is stored.
- **Forgot-password responses** must not leak account existence; the copy is generic in all modes.
- **`exposeResetTokenInMock`** is **false** in `environment.prod.ts` so production bundles never echo reset tokens or deep links in HTTP JSON (email delivery remains a backend responsibility).
- **Open redirect hardening** — login success navigation only honors `returnUrl` values that are same-origin relative paths (`/` prefix, no `//`).
- **XSS note** — `localStorage` tokens are standard but XSS-sensitive; pair with CSP and dependency hygiene for production deployments.
- **HTTPS** — required when pointing `apiUrl` at a real host.

---

## Flow Explanation

### Login (`/login`)

1. User submits email/password via reactive form validation.
2. `AuthService.login` posts to `/api/auth/login`.
3. Mock mode accepts **`demo@broker.local` / `Password1!`**; other combinations return **401** with a structured `{ message }` payload.
4. On success, the access token is written to `localStorage` and navigation proceeds to `/` or a safe `returnUrl`.

### Forgot password (`/forgot-password`)

1. User submits email; client validates format.
2. POST `/api/auth/forgot-password` always yields a **200** with neutral messaging when the email is non-empty.
3. Mock mode records a reset token with TTL; when `exposeResetTokenInMock` is true (development), the response may include `resetUrl` for local verification only.

### Reset password (`/reset-password?token=...`)

1. Component watches `token` query param, calls GET `/api/auth/reset-password/validate`.
2. Invalid/expired tokens render a dedicated error state with links back to forgot/login.
3. Valid tokens unlock the password + confirm form (with mismatch validation).
4. POST `/api/auth/reset-password` clears the token in mock mode and returns a success message; the UI redirects to `/login` after a short delay.

### Protected workspace (`/`)

1. `authGuard` checks `AuthService.isAuthenticated()` (derived from stored token).
2. Unauthenticated users are routed to `/login` with `returnUrl`.
3. **Sign out** clears the session and returns the user to `/login`.

---

## Future Improvements

- Replace mock interceptor with a **real broker API** and flip `useMockAuth` to `false`.
- Add **refresh tokens**, **rotating sessions**, and **server-side password hash** policies.
- Integrate an **email provider** (SendGrid, SES, etc.) with signed, short-lived reset URLs.
- Add **rate limiting** and **CAPTCHA** on public auth endpoints at the edge/API gateway.
- Expand automated tests with **router integration tests** once navigation harness ergonomics improve for lazy routes in this workspace.

---

## Verification

- `npx ng build` (production) — succeeds with environment replacements.
- `npx ng build --configuration development` — succeeds.
- `npx ng test --no-watch --browsers=ChromeHeadless` — succeeds.
- **Lint**: no `ng lint` target is configured; TypeScript and template checks run as part of `ng build`.

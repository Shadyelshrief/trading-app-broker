# Authentication Implementation Plan

This plan matches the **existing Angular 17 standalone** architecture: minimal new concepts, **HttpClient** for auth endpoints, **functional guards and interceptors**, and **Reactive forms** with built-in and custom validators.

---

## Goals

1. **Login** with validation, loading state, error messaging, and secure client-side token persistence.
2. **Forgot password** that calls an API, shows a **non-enumerating** success message, and (in mock-only dev) can surface a token for local testing when explicitly enabled.
3. **Reset password** with token from query string, **server-side validation** of token (via API), expiration and one-time-use semantics in the mock, clear handling for invalid/expired tokens.
4. **Route protection** for the existing broker shell; **guest guard** so authenticated users skip auth pages.
5. **Logout** from the shell header.
6. **Responsive** auth pages using the same **CSS variables** and card metaphors as `_tokens.scss` / shell styling.

---

## Architecture Decisions

### API contract (frontend expectations)

| Method | Path | Body | Success |
|--------|------|------|---------|
| POST | `/api/auth/login` | `{ email, password }` | `{ accessToken, user: { email } }` |
| POST | `/api/auth/forgot-password` | `{ email }` | `{ message }` (+ optional dev-only `resetToken`) |
| GET | `/api/auth/reset-password/validate` | query `token` | `{ valid: true }` or error |
| POST | `/api/auth/reset-password` | `{ token, password }` | `{ message }` |

### Mock vs real backend

- **`environment.useMockAuth === true`**: a **functional HTTP interceptor** short-circuits the above URLs and returns JSON responses without a network round trip. This preserves **one implementation** of `AuthApiService` using `HttpClient`.
- **`environment.useMockAuth === false`**: the same service calls a real origin; **CORS** and **HTTPS** become deployment concerns.

### Token handling

- Store **access token** in `localStorage` under a single app-specific key (survives refresh).
- Attach `Authorization: Bearer <token>` on requests under `environment.apiUrl` via a **bearer interceptor** (no token for auth login/forgot/reset endpoints).

### Session persistence

- Session is “logged in” if a **non-empty access token** is present in storage and optionally validated on app start (minimal: trust stored token until 401 from future APIs).

### Validation

- **Email**: required + pattern.
- **Password**: required, minimum length, pattern for basic complexity (aligned with mock demo password).

### Error handling

- Map `HttpErrorResponse` to user-visible messages; network errors get a generic fallback string.
- Reset page: on invalid token, show inline alert and link back to forgot-password.

---

## Files To Add / Touch (summary)

| Area | Files |
|------|------|
| Environments | `src/environments/environment.ts`, `environment.prod.ts` |
| Core auth | `auth.service.ts`, `auth-api.service.ts`, `auth.models.ts`, `auth.guard.ts`, `guest.guard.ts`, `mock-auth.interceptor.ts`, `auth-bearer.interceptor.ts` |
| Feature UI | `features/auth/login/...`, `forgot-password/...`, `reset-password/...` |
| Routing | `app.routes.ts`, `app.config.ts` |
| Root | `app.component.ts` (router outlet), `app.component.spec.ts` |
| Shell | `app-shell.component.html/.scss/.ts` (sign out) |
| Build | `angular.json` `fileReplacements` for production environment |
| Docs | `docs/AUTH_FLOW_SUMMARY.md` after implementation |

---

## UX Flows

### Login

1. User opens `/login`.
2. Submits form → `AuthService.login` → `AuthApiService` POST.
3. On success: persist token, navigate to `/` (shell).
4. On error: show message, keep form values (except password optional clear).

### Forgot password

1. User opens `/forgot-password`, submits email.
2. Always show **generic success** copy (do not reveal whether the account exists).
3. If mock dev flag exposes token, show copyable token / deep link to `/reset-password?token=...` for QA only.

### Reset password

1. User lands on `/reset-password?token=...` (from email in production).
2. On init, call **validate** endpoint; if invalid, show error UI.
3. Submit new password → POST reset → success message → navigate to login.

### Protected routes

- `/` (shell) requires `authGuard`.
- `/login`, `/forgot-password`, `/reset-password` use `guestGuard`.

---

## Security Notes (frontend)

- Never store passwords in `localStorage`.
- Prefer **HTTPS** in production; tokens in `localStorage` are vulnerable to XSS—mitigate with strict CSP and dependency hygiene in real deployments.
- Forgot-password responses must **not** leak account existence in production builds (`exposeResetTokenInMock` must be **false** in `environment.prod.ts`).

---

## Testing Strategy

- Update `AppComponent` spec to use **router testing** and a stub or real `AuthService` state so headings or outlets can be asserted without flakiness.
- Add focused unit tests for **token read/write** and guard behavior where practical.

---

## Out of Scope (kept minimal)

- Refresh tokens, OAuth2, MFA, and server-side session tables (no backend in repo).
- Email templating infrastructure (documented as backend responsibility).

# Project Overview

**trading-app-broker** is a single-page **Angular 17** application that presents a broker-style desktop: a **Golden Layout** workspace with dockable panels (watchlist, charts, market depth, orders). The repository is **frontend-only**; market data is simulated via **mock RxJS services** in `core/services`. There is **no separate backend service** in this repo, **no database**, and **no prior authentication** layer before the work described in the authentication plan.

The UI follows a **dark, glassmorphism-inspired** design system implemented with **global SCSS** (`src/styles.scss` importing tokens, base, and vendor styles) and **component-scoped SCSS** for layout and feature panels.

---

# Tech Stack

| Area | Technology |
|------|------------|
| Framework | Angular **17.3** (standalone components, `bootstrapApplication`) |
| Language | **TypeScript** 5.4 (strict compiler options) |
| Styling | **SCSS** (`inlineStyleLanguage: scss`, shared tokens in `src/styles/`) |
| UI / data grids | **AG Grid** (community + enterprise), **AG Charts** |
| Layout | **Golden Layout** v2 |
| Routing | `@angular/router` (routes were previously empty) |
| Reactive/async | **RxJS** 7 |
| Testing | **Karma** + **Jasmine** (`ng test`) |
| Build | `@angular-devkit/build-angular` **application** builder |
| Lint | **No ESLint / ng lint target** configured in `angular.json` |

---

# Architecture

- **Standalone root**: `AppComponent` bootstraps with `appConfig` from `app.config.ts`.
- **Feature modules** are folders under `src/app/features/*`, each exporting panel components consumed by `LayoutService` (not route-based lazy feature modules in the classic NgModule sense).
- **Core** holds cross-cutting concerns: `layout/` (shell, workspace, Golden Layout integration), `services/` (mock market services), `websocket/` (placeholder barrel).
- **Shared** holds models and a minimal `components` barrel (currently empty export).
- **API pattern**: in-app **mock streams** (`MockMarketService`, `MockMarketDepthService`) rather than HTTP APIs for trading data.

There is **no NgRx** or other global client store; state is **local to components** and **services** (`LayoutService`, mock services).

---

# Folder Structure

```
src/
  app/
    app.component.ts          # Root shell host (router outlet after auth work)
    app.config.ts             # Application providers
    app.routes.ts             # Route definitions
    core/
      layout/                 # App shell, workspace, Golden Layout
      services/               # Mock market / depth services
      websocket/              # Barrel placeholder
    features/
      charts/
      clients/
      market-depth/
      orders/
      portfolio/
      watchlist/
    shared/
      components/
      models/
      utils/
  assets/
  environments/               # (Added for API base URL and auth mode flags)
  index.html
  main.ts
  styles.scss
  styles/                     # _tokens, _base, _vendor
```

---

# Existing Features

- **Dockable workspace**: `WorkspaceComponent` + `LayoutService` register Angular panel types (watchlist, chart, market depth, orders) with Golden Layout.
- **App shell**: sidebar with module inventory copy + main workspace header and `app-workspace`.
- **Watchlist / market depth / charts / orders**: panel components with AG Grid or chart placeholders and mock streaming or static behavior.
- **Clients / portfolio**: exported barrels; primary UI focus is the four registered panels above.

---

# Authentication Analysis

**Current state**: `HttpClient` is provided globally with functional interceptors. `AuthService` persists an access token in `localStorage`, `authGuard` / `guestGuard` protect routes, and standalone pages under `features/auth` implement login and password recovery. Mock responses are supplied by `mock-auth.interceptor.ts` when `environment.useMockAuth` is true.

Golden Layout and mock market services remain decoupled from auth routing.

---

# Routing Structure

The root component renders a **`RouterOutlet`**. `app.routes.ts` wires:

- **`/login`**, **`/forgot-password`**, **`/reset-password`** — lazy standalone pages behind `guestGuard`.
- **`/`** — lazy `AppShellComponent` behind `authGuard`.
- **`**`** — redirects to **`''`** (shell), which re-triggers authentication when unauthenticated.

---

# API Structure

Trading data remains mock-first without HTTP.

Authentication follows a small **REST-shaped contract** under **`/api/auth/*`**, consumed by `AuthApiService`. With `useMockAuth` enabled, `mock-auth.interceptor.ts` answers those calls in-process; with it disabled, the same paths should be implemented by a real backend (CORS and HTTPS are deployment concerns).

---

# State Management

- **No global store**; use **injectable services** and **Angular signals** where appropriate for auth session state.
- Trading panels continue to use **inputs**, **services**, and **AG Grid APIs** as today.

---

# Shared Components

- `shared/components/index.ts` is effectively empty (`export {}`).
- Reusable visual language lives in **global SCSS variables** (`_tokens.scss`) and **layout shell** styles.

---

# Database Models

**None** in this repository (no Prisma, TypeORM, SQL, etc.).

---

# Environment Variables

Runtime configuration lives in **`src/environments/environment.ts`** (development defaults) and **`src/environments/environment.prod.ts`** (production replacements via `angular.json`). Key fields:

- `production` — toggled by build configuration.
- `apiUrl` — HTTP prefix for API calls (default `/api`).
- `useMockAuth` — when true, auth traffic is handled by `mock-auth.interceptor.ts`.
- `exposeResetTokenInMock` — when true, forgot-password responses may include a `resetUrl` for local QA only; **always false** in `environment.prod.ts`.

There is no `.env` file or process-level secret injection in this repository today.

---

# Important Business Logic

- **Golden Layout** lifecycle (`init` / `destroy`, `ResizeObserver`, sub-window detection via `gl-window` query param) is the most delicate integration; auth routing should **not** reset layout state more than necessary (navigate away only on logout).
- **Mock market** tick logic is self-contained in `MockMarketService` and unrelated to auth.

---

# Reusable Patterns

- **Standalone** components with explicit `imports: [...]`.
- **`inject()`** for dependency injection in components and services.
- **`ChangeDetectionStrategy.OnPush`** on several feature panels.
- **`takeUntilDestroyed()`** for subscriptions in components with `DestroyRef`.
- **SCSS** with CSS variables from `_tokens.scss` for surfaces, borders, accent colors.

---

# Risks & Notes

- **Single-repo frontend only**: password reset email delivery cannot be implemented without an external mailer or backend; flows should be **API-contract-first** with a mock path for local development.
- **Strict templates** (`strictTemplates: true`): all templates must satisfy typed checks.
- **Tests**: `app.component.spec.ts` previously asserted copy that did not match the live shell heading; tests should be aligned with the router-based bootstrap.
- **No ESLint target**: “run lint” maps to **TypeScript compile + Angular template checks** via `ng build` unless ESLint is added later.

---

# Recommended Improvements

- Add a **real backend** (or BaaS) and set `useMockAuth: false` with the same route contracts.
- Add **ESLint** + **Prettier** with `ng lint` in CI.
- Introduce **environment-specific** API hosts via `fileReplacements` (already recommended for production auth flags).
- Consider **lazy loading** auth and shell routes once the app grows.
- Add **e2e tests** (Playwright/Cypress) for login and reset flows when a stable backend exists.

# Layout Architecture — Enterprise Trading Shell

This document describes the **post-login application shell** introduced for a Bloomberg-style / enterprise brokerage desktop. It complements the existing Golden Layout workspace and preserves all prior routing contracts (`/login`, `/forgot-password`, `/reset-password`, authenticated `/` with child deep links).

---

## PDF source note

The **TradeNetX User Guide PDF** referenced in the product brief was **not present in the repository** at implementation time. The navigation hierarchy in `src/app/core/navigation/app-menu.config.ts` therefore combines:

1. The **explicit module lists** you provided (Pricing, Trading, Management, Charts, plus Clients & Portfolios).
2. **Common enterprise sections** (Introduction, Managing Settings, Market Activity) typical of legacy trading desktops.

When the official PDF is added to the repo, treat it as authoritative: reconcile labels, grouping, and routes in `app-menu.config.ts` only, keeping components unchanged where possible.

---

## Menu hierarchy (current config)

Navigation is **data-driven** from `APP_MENU_GROUPS` in `app-menu.config.ts`. Each group maps to a top-level button and an overlay menu in the horizontal navigation bar.

| Group ID | Label (UI) | Representative leaves |
|----------|--------------|------------------------|
| `dashboard` | Dashboard | Overview (`/app`) |
| `pricing` | Markets | Market watch, summary, indices, T&S, depth, map, news, charts, watch lists |
| `trading` | Trading | Order ticket, blotter, positions, trade feed, execution analytics |
| `management` | Management | Client directory and profile |
| `reports` | Reports | Trade, portfolio, and audit reports |

Each leaf exposes:

- `id` — stable key for analytics/RBAC later.
- `label` — UI string.
- `icon` — `TradingIconName` rendered by `TradingIconComponent`.
- `routerLink` — absolute router commands, e.g. `['/pricing/market-summary']`.
- `permissions` — optional placeholder objects for future role checks (not enforced yet).

---

## Layout architecture

### High-level structure

```
AppShellComponent (route: '/app' + authGuard)
├── TradingHeaderComponent (56px market context + workspace actions)
├── TopNavigationComponent (40px grouped horizontal navigation)
└── main.app-shell__workspace (100% width, remaining height)
    └── <router-outlet /> → WorkspacePageComponent (default)
        └── WorkspaceComponent (Golden Layout host)
```

**Golden Layout pop-out windows** (`?gl-window`) still render **only** `WorkspaceComponent` with `[subWindow]="true"` to avoid nested chrome.

### Routing

- Authenticated application root remains **`/app` → `AppShellComponent`**.
- **Child routes** under the shell:
  - `''` (full) → `WorkspacePageComponent` (Golden Layout).
  - `**` → same host so deep links (e.g. `/pricing/market-summary`) resolve without 404s until feature modules ship.

Auth routes (`/login`, etc.) are unchanged siblings.

### State management

| Concern | Mechanism |
|---------|-----------|
| Theme / workspace id | `ShellLayoutService` (`providedIn: 'root'`) with **signals** + `localStorage` via `effect()` |
| Navigation labels & tree | **Static config** `APP_MENU_GROUPS` (future: CMS or API) |
| Golden Layout / panels | Existing `LayoutService` + `WorkspaceComponent` (unchanged) |

No NgRx added; patterns match the rest of the app (signals + injectable services).

---

## Component structure

| Path | Responsibility |
|------|------------------|
| `core/navigation/app-menu.types.ts` | `NavMenuGroup`, `NavMenuItem`, `TradingIconName`, permission placeholder |
| `core/navigation/app-menu.config.ts` | `APP_MENU_GROUPS` export |
| `core/layout/shell-layout.service.ts` | Persisted chrome state, theme attribute on `documentElement` |
| `core/layout/trading-header/` | Market/index selectors, live metrics, clock/feeder state, workspace selector, save/reset, theme, notifications, profile |
| `core/layout/top-navigation/` | Grouped overlay menus, keyboard navigation, active screen state, command/symbol search, workspace drag/open integration |
| `core/layout/trading-icon/` | Lightweight SVG icon set (no icon font dependency) |
| `core/layout/workspace-page.component.ts` | Routed host for `<app-workspace />` inside `router-outlet` |
| `core/layout/app-shell.component.*` | Composes the fixed header/navigation rows and full-width workspace outlet |

---

## Responsiveness strategy

| Breakpoint | Behaviour |
|------------|-----------|
| **> 900px** | All configured top-level menu groups are visible; workspace remains full width |
| **≤ 900px** | Secondary top-level groups move under `More`; no side drawer is introduced |
| **≤ 620px** | Market metrics progressively condense while market/index and workspace actions remain in the header |

---

## Animation & motion strategy

- **Top navigation**: short color/background/chevron transitions with reduced-motion fallbacks.
- Dropdowns are absolutely positioned overlays and never change shell or workspace height.
- **Existing** auth view transitions remain global (`auth-view-transitions.scss`).

Avoid layout thrashing: decorative layers use `pointer-events: none`; intervals limited to header clock with cleanup on destroy.

---

## Theming

- `ShellLayoutService` sets `document.documentElement.dataset.theme` to `dark` | `light`.
- `_shell-theme.scss` redefines core CSS variables under `:root[data-theme='light']` for a readable light brokerage palette.
- Toggle is available in the trading header.

---

## Accessibility

- Primary `<nav>` has `aria-label="Primary navigation"`.
- Top-level menu buttons expose `aria-expanded` and `aria-haspopup`.
- Arrow keys, Home/End, Enter/Space, and Escape are supported across menu triggers and menu items.
- Command search is a labelled combobox with active-option keyboard navigation.
- Profile menu uses `aria-expanded` / `role="menu"`.

---

## Future extensibility

1. **RBAC**: Filter `APP_MENU_GROUPS` in a pipe or resolver using `permissions` before render.
2. **Lazy feature routes**: Replace catch-all child with real `loadChildren` modules per section while keeping shell parent.
3. **Command palette service**: Extract top-navigation search orchestration if it grows beyond the current screen/symbol catalog.
4. **Live market status**: Continue extending the existing realtime facade as new exchange fields become available.

---

## Files touched (reference)

- `src/app/core/navigation/*`
- `src/app/core/layout/shell-layout.service.ts`
- `src/app/core/layout/trading-header/*`
- `src/app/core/layout/top-navigation/*`
- `src/app/core/layout/trading-icon/*`
- `src/app/core/layout/workspace-page.component.*`
- `src/app/core/layout/app-shell.component.*`
- `src/app/app.routes.ts`
- `src/styles/_shell-theme.scss`, `src/styles.scss`

---

## Verification

Run `npx ng build` and `npx ng test` after layout changes. No new global stores; Golden Layout behaviour is unchanged inside `WorkspacePageComponent`.

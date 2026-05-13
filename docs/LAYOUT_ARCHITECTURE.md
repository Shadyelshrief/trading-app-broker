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

Navigation is **data-driven** from `APP_MENU_GROUPS` in `app-menu.config.ts`. Each group maps to an accordion section in the sidebar.

| Group ID | Label (UI) | Representative leaves |
|----------|--------------|------------------------|
| `introduction` | Introduction | Overview (`/`), Getting started |
| `settings` | Managing Settings | Preferences, Workspaces, Themes, Language, Password |
| `market-activity` | Market Activity | Watch lists, Tickers, Market performance |
| `pricing` | Pricing | Market summary, full market, indices, T&S, depth, map, news, … |
| `trading` | Trading | Place/monitor orders, statistics, portfolio, watch lists, tickers |
| `clients` | Clients & Portfolios | Search, information, portfolios |
| `charts` | Charts | Indicators, symbol charting, comparison |
| `management` | Management | Orders, clients, workspaces, settings |

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
AppShellComponent (route: '' + authGuard)
├── TradingHeaderComponent (global chrome)
└── div.app-shell__body
    ├── optional scrim (mobile drawer)
    ├── TradingSidebarComponent (primary nav)
    └── main.app-shell__workspace
        └── <router-outlet /> → WorkspacePageComponent (default)
            └── WorkspaceComponent (Golden Layout host)
```

**Golden Layout pop-out windows** (`?gl-window`) still render **only** `WorkspaceComponent` with `[subWindow]="true"` to avoid nested chrome.

### Routing

- Authenticated root remains **`''` → `AppShellComponent`**.
- **Child routes** under the shell:
  - `''` (full) → `WorkspacePageComponent` (Golden Layout).
  - `**` → same host so deep links (e.g. `/pricing/market-summary`) resolve without 404s until feature modules ship.

Auth routes (`/login`, etc.) are unchanged siblings.

### State management

| Concern | Mechanism |
|---------|-----------|
| Sidebar collapse / mobile drawer / theme / workspace id | `ShellLayoutService` (`providedIn: 'root'`) with **signals** + `localStorage` via `effect()` |
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
| `core/layout/trading-header/` | Logo strip, ribbon, market status, command search, clock, workspace selector, theme toggle, notifications stub, profile menu |
| `core/layout/trading-sidebar/` | Collapsible rail, accordion groups, `routerLink` + `RouterLinkActive` |
| `core/layout/trading-icon/` | Lightweight SVG icon set (no icon font dependency) |
| `core/layout/workspace-page.component.ts` | Routed host for `<app-workspace />` inside `router-outlet` |
| `core/layout/app-shell.component.*` | Composes header + body + sidebar + outlet |

---

## Responsiveness strategy

| Breakpoint | Behaviour |
|------------|-----------|
| **> 960px** | Fixed two-column body: sidebar width **17.5rem** (collapsed **4.25rem**) + fluid workspace |
| **≤ 960px** | Single-column body; sidebar becomes a **fixed drawer** off-canvas; `ShellLayoutService.mobileNavOpen` + scrim; collapse rail control hidden |
| **≤ 640px** | Tighter padding; header hides non-critical clusters (workspace select, clock) |

---

## Animation & motion strategy

- **Sidebar width / drawer slide**: CSS `transition` on `transform` + `width` (reduced-motion disables long transitions in sidebar SCSS where declared).
- **Header ribbon**: lightweight marquee (`transform: translateX`) with reduced-motion fallback (static wrap).
- **Scrim**: short opacity keyframe.
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
- Sidebar links expose `title` tooltips when the rail is collapsed (labels hidden).
- Mobile drawer uses **scrim** + **Escape** (handled in `TradingHeaderComponent`) to close.
- Command search uses visually hidden `<span>` label.
- Profile menu uses `aria-expanded` / `role="menu"`.

---

## Future extensibility

1. **RBAC**: Filter `APP_MENU_GROUPS` in a pipe or resolver using `permissions` before render.
2. **Lazy feature routes**: Replace catch-all child with real `loadChildren` modules per section while keeping shell parent.
3. **Command palette**: Wire header search to a `CommandPaletteService`.
4. **Live market status**: Replace static header chip with exchange calendar service.
5. **Workspace persistence**: Connect workspace selector to Golden Layout saved layouts API.

---

## Files touched (reference)

- `src/app/core/navigation/*`
- `src/app/core/layout/shell-layout.service.ts`
- `src/app/core/layout/trading-header/*`
- `src/app/core/layout/trading-sidebar/*`
- `src/app/core/layout/trading-icon/*`
- `src/app/core/layout/workspace-page.component.*`
- `src/app/core/layout/app-shell.component.*`
- `src/app/app.routes.ts`
- `src/styles/_shell-theme.scss`, `src/styles.scss`

---

## Verification

Run `npx ng build` and `npx ng test` after layout changes. No new global stores; Golden Layout behaviour is unchanged inside `WorkspacePageComponent`.

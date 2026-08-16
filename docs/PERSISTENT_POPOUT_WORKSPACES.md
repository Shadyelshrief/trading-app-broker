# Persistent popout workspaces

Workspace preferences continue to use `GET/PUT /workspaces/my-preferences`. The `layoutJson` value is now a versioned v2 envelope containing the main Golden Layout configuration, normalized popout child configurations, serializable component state, geometry, and workspace-scoped global state. Bare legacy Golden Layout JSON is migrated on read.

Startup restores only the main layout. Saved external windows are offered through the **Restore Trading Workspace** banner because Golden Layout ultimately relies on `window.open`, which browsers require to run from a user gesture. The restore state machine prevents duplicates and reports blocked windows with Retry and Continue-with-main actions.

Golden Layout remains the only renderer and popout bootstrap. Popouts use its existing `gl-window` child configuration, while the application shell omits main navigation/header markup in child windows. Widget `stateRequestEvent` callbacks remain responsible for serializable widget state.

`BroadcastChannel` synchronizes workspace events, linked filters, market/index context, theme, language, logout, and session expiration. Logout/session expiration disconnects market data, clears authentication state, closes child windows, and redirects any child the browser refuses to close.

## Market data limitation

Each browser window currently instantiates the existing `MarketDataService` abstraction and therefore may establish its own feeder connection. Topic construction, normalization, reconnect/stale behavior, credentials, and widget APIs remain shared and unchanged; no websocket code exists in popout widgets. If the feeder needs one physical connection across all windows, implement a `SharedWorker` or elected leader-window transport behind `MarketDataService` in a later change so widget APIs remain stable.

## Geometry

Saved `screenX`, `screenY`, `outerWidth`, and `outerHeight` are reapplied when browser/OS policy permits. Single-screen coordinates are clamped into the visible work area. On extended desktops, coordinates are preserved when exact monitor enumeration is unavailable; the optional Screen Details API can later provide more precise monitor validation without becoming a requirement.

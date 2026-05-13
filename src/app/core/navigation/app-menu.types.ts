/**
 * Icon keys rendered by {@link TradingIconComponent}.
 * Extend as new modules ship.
 */
export type TradingIconName =
  | 'home'
  | 'book'
  | 'sliders'
  | 'activity'
  | 'list'
  | 'hash'
  | 'trending'
  | 'users'
  | 'pie'
  | 'orders'
  | 'eye'
  | 'chart'
  | 'layers'
  | 'grid'
  | 'clock'
  | 'search'
  | 'bell'
  | 'user'
  | 'settings'
  | 'globe'
  | 'lock'
  | 'layout';

/** Role / permission placeholder for future RBAC wiring. */
export interface NavPermissionRef {
  /** Stable permission key, e.g. `pricing.market_summary.view`. */
  id: string;
}

export interface NavMenuItem {
  id: string;
  label: string;
  icon: TradingIconName;
  /** RouterLink commands (absolute from root). */
  routerLink?: (string | number)[];
  /** Nested items (accordion section). */
  children?: NavMenuItem[];
  /** Optional RBAC hooks — not enforced yet. */
  permissions?: NavPermissionRef[];
}

export interface NavMenuGroup {
  id: string;
  label: string;
  items: NavMenuItem[];
}

import { NavMenuGroup } from './app-menu.types';

/**
 * Enterprise navigation model inspired by TradeNetX-style brokerage desktops.
 *
 * **PDF note:** No TradeNetX User Guide PDF is present in this repository. This hierarchy
 * merges the product areas you specified (Pricing, Trading, Management, Charts) with
 * common sections (Introduction, Settings, Market activity) so the shell is ready for
 * future module wiring. When the official PDF is available in-repo, align labels and
 * grouping to that document and update this file as the single source of truth.
 */
export const APP_MENU_GROUPS: readonly NavMenuGroup[] = [
  {
    id: 'introduction',
    label: 'Introduction',
    items: [
      {
        id: 'intro-overview',
        label: 'Overview',
        icon: 'book',
        routerLink: ['/'],
        permissions: [{ id: 'core.workspace.view' }]
      },
      {
        id: 'intro-getting-started',
        label: 'Getting Started',
        icon: 'activity',
        routerLink: ['/introduction/getting-started'],
        permissions: [{ id: 'core.help.view' }]
      }
    ]
  },
  {
    id: 'settings',
    label: 'Managing Settings',
    items: [
      {
        id: 'settings-general',
        label: 'Preferences',
        icon: 'sliders',
        routerLink: ['/settings/preferences'],
        permissions: [{ id: 'settings.preferences.view' }]
      },
      {
        id: 'settings-workspaces',
        label: 'Workspaces',
        icon: 'layout',
        routerLink: ['/settings/workspaces'],
        permissions: [{ id: 'settings.workspaces.view' }]
      },
      {
        id: 'settings-theme',
        label: 'Themes',
        icon: 'layers',
        routerLink: ['/settings/themes'],
        permissions: [{ id: 'settings.themes.view' }]
      },
      {
        id: 'settings-language',
        label: 'Language',
        icon: 'globe',
        routerLink: ['/settings/language'],
        permissions: [{ id: 'settings.language.view' }]
      },
      {
        id: 'settings-password',
        label: 'Password Management',
        icon: 'lock',
        routerLink: ['/settings/password'],
        permissions: [{ id: 'settings.security.view' }]
      }
    ]
  },
  {
    id: 'market-activity',
    label: 'Market Activity',
    items: [
      {
        id: 'market-watchlists',
        label: 'Watch Lists',
        icon: 'list',
        routerLink: ['/market/watch-lists'],
        permissions: [{ id: 'market.watchlists.view' }]
      },
      {
        id: 'market-tickers',
        label: 'Tickers',
        icon: 'hash',
        routerLink: ['/market/tickers'],
        permissions: [{ id: 'market.tickers.view' }]
      },
      {
        id: 'market-performance',
        label: 'Market Performance',
        icon: 'trending',
        routerLink: ['/market/performance'],
        permissions: [{ id: 'market.performance.view' }]
      }
    ]
  },
  {
    id: 'pricing',
    label: 'Pricing',
    items: [
      { id: 'pricing-summary', label: 'Market Summary', icon: 'activity', routerLink: ['/pricing/market-summary'] },
      { id: 'pricing-full', label: 'Full Market', icon: 'grid', routerLink: ['/pricing/full-market'] },
      { id: 'pricing-indices', label: 'Market Indices', icon: 'trending', routerLink: ['/pricing/market-indices'] },
      { id: 'pricing-time-sales', label: 'Time & Sales', icon: 'clock', routerLink: ['/pricing/time-and-sales'] },
      { id: 'pricing-top-symbols', label: 'Top Symbols', icon: 'hash', routerLink: ['/pricing/top-symbols'] },
      {
        id: 'pricing-historical',
        label: 'Historical Symbols',
        icon: 'chart',
        routerLink: ['/pricing/historical-symbols']
      },
      { id: 'pricing-depth', label: 'Market Depth', icon: 'layers', routerLink: ['/pricing/market-depth'] },
      { id: 'pricing-spectrum', label: 'Price Spectrum', icon: 'activity', routerLink: ['/pricing/price-spectrum'] },
      { id: 'pricing-map', label: 'Market Map', icon: 'grid', routerLink: ['/pricing/market-map'] },
      { id: 'pricing-news', label: 'News & Announcements', icon: 'book', routerLink: ['/pricing/news'] }
    ]
  },
  {
    id: 'trading',
    label: 'Trading',
    items: [
      { id: 'trade-place', label: 'Place Orders', icon: 'orders', routerLink: ['/trading/place-orders'] },
      { id: 'trade-monitor', label: 'Monitor Orders', icon: 'eye', routerLink: ['/trading/monitor-orders'] },
      { id: 'trade-stats', label: 'Order Statistics', icon: 'pie', routerLink: ['/trading/order-statistics'] },
      {
        id: 'trade-portfolio',
        label: 'Portfolio Positioning',
        icon: 'pie',
        routerLink: ['/trading/portfolio-positioning']
      },
      { id: 'trade-watchlists', label: 'Watch Lists', icon: 'list', routerLink: ['/trading/watch-lists'] },
      { id: 'trade-tickers', label: 'Tickers', icon: 'hash', routerLink: ['/trading/tickers'] }
    ]
  },
  {
    id: 'clients',
    label: 'Clients & Portfolios',
    items: [
      { id: 'clients-search', label: 'Clients Search', icon: 'search', routerLink: ['/clients/search'] },
      {
        id: 'clients-information',
        label: 'Client Information',
        icon: 'users',
        routerLink: ['/clients/information']
      },
      { id: 'clients-portfolios', label: 'Portfolios', icon: 'pie', routerLink: ['/clients/portfolios'] }
    ]
  },
  {
    id: 'charts',
    label: 'Charts',
    items: [
      {
        id: 'charts-indicators',
        label: 'Technical Indicators',
        icon: 'layers',
        routerLink: ['/charts/technical-indicators']
      },
      { id: 'charts-symbol', label: 'Symbol Charting', icon: 'chart', routerLink: ['/charts/symbol'] },
      {
        id: 'charts-compare',
        label: 'Comparison Charts',
        icon: 'activity',
        routerLink: ['/charts/comparison']
      }
    ]
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      { id: 'mgmt-orders', label: 'Managing Orders', icon: 'orders', routerLink: ['/management/orders'] },
      { id: 'mgmt-clients', label: 'Clients', icon: 'users', routerLink: ['/management/clients'] },
      { id: 'mgmt-workspaces', label: 'Workspaces', icon: 'layout', routerLink: ['/management/workspaces'] },
      { id: 'mgmt-settings', label: 'Settings', icon: 'settings', routerLink: ['/management/settings'] }
    ]
  }
] as const;

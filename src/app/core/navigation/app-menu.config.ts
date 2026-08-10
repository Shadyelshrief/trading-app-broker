import { NavMenuGroup } from './app-menu.types';

const APP_ROOT = '/app';
const appRoute = (path: string): string[] => [`${APP_ROOT}${path}`];

export const APP_MENU_GROUPS: readonly NavMenuGroup[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    items: [
      {
        id: 'dashboard-home',
        label: 'Overview',
        icon: 'home',
        routerLink: [APP_ROOT],
        permissions: [{ id: 'dashboard.view' }]
      }
    ]
  },
  {
    id: 'pricing',
    label: 'Pricing',
    items: [
      {
        id: 'pricing-full-market',
        label: 'Market Watch',
        icon: 'grid',
        routerLink: appRoute('/pricing/full-market')
      },
      {
        id: 'pricing-market-summary',
        label: 'Market Summary',
        icon: 'activity',
        routerLink: appRoute('/pricing/market-summary')
      },
      {
        id: 'pricing-market-indices',
        label: 'Indices',
        icon: 'trending',
        routerLink: appRoute('/pricing/market-indices')
      },
      {
        id: 'pricing-time-and-sales',
        label: 'Time & Sales',
        icon: 'clock',
        routerLink: appRoute('/pricing/time-and-sales')
      },
      {
        id: 'pricing-market-depth-by-price',
        label: 'Depth by Price',
        icon: 'layers',
        routerLink: appRoute('/pricing/market-depth-by-price')
      },
      {
        id: 'pricing-market-depth-by-order',
        label: 'Order Book',
        icon: 'layers',
        routerLink: appRoute('/pricing/market-depth-by-order')
      },
      {
        id: 'pricing-price-spectrum',
        label: 'Spectrum',
        icon: 'activity',
        routerLink: appRoute('/pricing/price-spectrum')
      },
      {
        id: 'pricing-market-map',
        label: 'Sector Map',
        icon: 'grid',
        routerLink: appRoute('/pricing/market-map')
      },
      {
        id: 'pricing-market-performance-indices',
        label: 'Index Performance',
        icon: 'chart',
        routerLink: appRoute('/pricing/market-performance-indices')
      },
      {
        id: 'pricing-market-performance-security',
        label: 'Asset Performance',
        icon: 'trending',
        routerLink: appRoute('/pricing/market-performance-security')
      },
      {
        id: 'pricing-top-symbols',
        label: 'Top Movers',
        icon: 'hash',
        routerLink: appRoute('/pricing/top-symbols')
      },
      {
        id: 'pricing-historical-top-symbols',
        label: 'Historical Movers',
        icon: 'book',
        routerLink: appRoute('/pricing/historical-top-symbols')
      },
      {
        id: 'pricing-news-announcements',
        label: 'News & Corporate Actions',
        icon: 'book',
        routerLink: appRoute('/pricing/news-announcements')
      },
      {
        id: 'pricing-tickers',
        label: 'Tickers',
        icon: 'hash',
        children: [
          {
            id: 'pricing-trading-ticker',
            label: 'Trade Ticker',
            icon: 'activity',
            routerLink: appRoute('/pricing/trading-ticker')
          },
          {
            id: 'pricing-pricing-ticker',
            label: 'Quote Ticker',
            icon: 'hash',
            routerLink: appRoute('/pricing/pricing-ticker')
          },
          {
            id: 'pricing-announcements-ticker',
            label: 'News Ticker',
            icon: 'book',
            routerLink: appRoute('/pricing/announcements-ticker')
          }
        ]
      },
      {
        id: 'pricing-charts',
        label: 'Charts',
        icon: 'chart',
        routerLink: appRoute('/pricing/charts')
      },
      {
        id: 'pricing-watch-lists',
        label: 'Watch Lists',
        icon: 'list',
        children: [
          {
            id: 'pricing-saved-watch-lists',
            label: 'My Watchlists',
            icon: 'list',
            routerLink: appRoute('/pricing/saved-watch-lists')
          },
          {
            id: 'pricing-create-watch-list',
            label: 'New Watchlist',
            icon: 'sliders',
            routerLink: appRoute('/pricing/create-watch-list')
          }
        ]
      }
    ]
  },
  {
    id: 'trading',
    label: 'Trading',
    items: [
      {
        id: 'trading-order-entry',
        label: 'Order Ticket',
        icon: 'orders',
        routerLink: appRoute('/trading/order-entry')
      },
      {
        id: 'trading-order-monitor',
        label: 'Order Blotter',
        icon: 'eye',
        routerLink: appRoute('/trading/order-monitor')
      },
      {
        id: 'trading-portfolio-position',
        label: 'Positions',
        icon: 'pie',
        routerLink: appRoute('/trading/portfolio-position')
      },
      {
        id: 'trading-execution-ticker',
        label: 'Trade Feed',
        icon: 'activity',
        routerLink: appRoute('/trading/execution-ticker')
      },
      {
        id: 'trading-order-statistics',
        label: 'Execution Analytics',
        icon: 'pie',
        routerLink: appRoute('/trading/order-statistics')
      }
    ]
  },
  {
    id: 'management',
    label: 'Management',
    items: [
      {
        id: 'management-client-search',
        label: 'Client Directory',
        icon: 'search',
        routerLink: appRoute('/management/client-search')
      },
      {
        id: 'management-client-information',
        label: 'Client Profile',
        icon: 'users',
        routerLink: appRoute('/management/client-information')
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      {
        id: 'reports-trading',
        label: 'Trade Reports',
        icon: 'book',
        routerLink: appRoute('/reports/trading-reports')
      },
      {
        id: 'reports-portfolio',
        label: 'Portfolio Reports',
        icon: 'pie',
        routerLink: appRoute('/reports/portfolio-reports')
      },
      {
        id: 'reports-audit',
        label: 'Audit Trail',
        icon: 'lock',
        routerLink: appRoute('/reports/audit-reports')
      }
    ]
  }
] as const;

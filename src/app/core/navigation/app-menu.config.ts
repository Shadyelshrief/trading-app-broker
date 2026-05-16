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
        label: 'Dashboard',
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
        label: 'Full Market',
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
        label: 'Market Indices',
        icon: 'trending',
        routerLink: appRoute('/pricing/market-indices')
      },
      {
        id: 'pricing-time-and-sales',
        label: 'Time And Sales',
        icon: 'clock',
        routerLink: appRoute('/pricing/time-and-sales')
      },
      {
        id: 'pricing-market-depth-by-price',
        label: 'Market Depth By Price',
        icon: 'layers',
        routerLink: appRoute('/pricing/market-depth-by-price')
      },
      {
        id: 'pricing-market-depth-by-order',
        label: 'Market Depth By Order',
        icon: 'layers',
        routerLink: appRoute('/pricing/market-depth-by-order')
      },
      {
        id: 'pricing-price-spectrum',
        label: 'Price Spectrum',
        icon: 'activity',
        routerLink: appRoute('/pricing/price-spectrum')
      },
      {
        id: 'pricing-market-map',
        label: 'Market Map',
        icon: 'grid',
        routerLink: appRoute('/pricing/market-map')
      },
      {
        id: 'pricing-top-symbols',
        label: 'Top Symbols',
        icon: 'hash',
        routerLink: appRoute('/pricing/top-symbols')
      },
      {
        id: 'pricing-news-announcements',
        label: 'News & Announcements',
        icon: 'book',
        routerLink: appRoute('/pricing/news-announcements')
      },
      {
        id: 'pricing-tickers',
        label: 'Tickers',
        icon: 'hash',
        routerLink: appRoute('/pricing/tickers')
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
        routerLink: appRoute('/pricing/watch-lists')
      }
    ]
  },
  {
    id: 'trading',
    label: 'Trading',
    items: [
      {
        id: 'trading-order-entry',
        label: 'Order Entry',
        icon: 'orders',
        routerLink: appRoute('/trading/order-entry')
      },
      {
        id: 'trading-basket-orders',
        label: 'Basket Orders',
        icon: 'grid',
        routerLink: appRoute('/trading/basket-orders')
      },
      {
        id: 'trading-order-monitor',
        label: 'Order Monitor',
        icon: 'eye',
        routerLink: appRoute('/trading/order-monitor')
      },
      {
        id: 'trading-portfolio-position',
        label: 'Portfolio Position',
        icon: 'pie',
        routerLink: appRoute('/trading/portfolio-position')
      },
      {
        id: 'trading-transactions-ticker',
        label: 'Transactions Ticker',
        icon: 'activity',
        routerLink: appRoute('/trading/transactions-ticker')
      },
      {
        id: 'trading-order-statistics',
        label: 'Order Statistics',
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
        label: 'Client Search',
        icon: 'search',
        routerLink: appRoute('/management/client-search')
      },
      {
        id: 'management-client-information',
        label: 'Client Information',
        icon: 'users',
        routerLink: appRoute('/management/client-information')
      },
      {
        id: 'management-corebank-transfer',
        label: 'CoreBank Transfer',
        icon: 'layout',
        routerLink: appRoute('/management/corebank-transfer')
      }
    ]
  },
  {
    id: 'reports',
    label: 'Reports',
    items: [
      {
        id: 'reports-trading',
        label: 'Trading Reports',
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
        label: 'Audit Reports',
        icon: 'lock',
        routerLink: appRoute('/reports/audit-reports')
      }
    ]
  }
] as const;

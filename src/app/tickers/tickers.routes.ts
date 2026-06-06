import { Routes } from '@angular/router';

export const TICKERS_ROUTES: Routes = [
  {
    path: 'trading',
    loadComponent: () => import('./trading-ticker/trading-ticker.component').then((m) => m.TradingTickerComponent)
  },
  {
    path: 'pricing',
    loadComponent: () => import('./pricing-ticker/pricing-ticker.component').then((m) => m.PricingTickerComponent)
  },
  {
    path: 'announcements',
    loadComponent: () =>
      import('./announcements-ticker/announcements-ticker.component').then((m) => m.AnnouncementsTickerComponent)
  }
];

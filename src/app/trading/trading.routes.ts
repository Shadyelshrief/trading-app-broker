import { Routes } from '@angular/router';

export const TRADING_ROUTES: Routes = [
  {
    path: 'order-entry',
    loadComponent: () => import('./order-entry/order-entry.component').then((m) => m.OrderEntryComponent)
  },
  {
    path: 'order-monitor',
    loadComponent: () => import('./order-monitoring/order-monitoring.component').then((m) => m.OrderMonitoringComponent)
  },
  {
    path: 'order-statistics',
    loadComponent: () => import('./order-statistics/order-statistics.component').then((m) => m.OrderStatisticsComponent)
  }
];

import { Routes } from '@angular/router';

export const MARKET_PERFORMANCE_ROUTES: Routes = [
  {
    path: 'indices',
    loadComponent: () =>
      import('./indices-performance/indices-performance.component').then((m) => m.IndicesPerformanceComponent)
  },
  {
    path: 'security',
    loadComponent: () =>
      import('./security-performance/security-performance.component').then((m) => m.SecurityPerformanceComponent)
  }
];

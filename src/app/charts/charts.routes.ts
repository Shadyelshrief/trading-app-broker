import { Routes } from '@angular/router';

export const chartsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./charting/charting.component').then((m) => m.ChartingComponent)
  }
];

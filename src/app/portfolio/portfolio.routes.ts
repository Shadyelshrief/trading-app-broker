import { Routes } from '@angular/router';

export const PORTFOLIO_ROUTES: Routes = [
  {
    path: 'portfolio-positioning',
    loadComponent: () =>
      import('./portfolio-positioning/portfolio-positioning.component').then((m) => m.PortfolioPositioningComponent)
  }
];

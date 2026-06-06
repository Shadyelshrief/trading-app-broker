import { Routes } from '@angular/router';

import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'login'
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login-page.component').then((m) => m.LoginPageComponent)
  },
  {
    path: 'forgot-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password-page.component').then(
        (m) => m.ForgotPasswordPageComponent
      )
  },
  {
    path: 'reset-password',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/reset-password/reset-password-page.component').then(
        (m) => m.ResetPasswordPageComponent
      )
  },
  {
    path: 'app',
    canActivate: [authGuard],
    loadComponent: () => import('./core/layout/app-shell.component').then((m) => m.AppShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/full-market',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/watch-lists',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/saved-watch-lists',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/create-watch-list',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/watch-lists/:id',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/charts',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/trading-ticker',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/pricing-ticker',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/announcements-ticker',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/market-performance-indices',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'pricing/market-performance-security',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/execution-ticker',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/order-entry',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/order-entry/:mode/:orderNumber',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/order-monitor',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/order-statistics',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/portfolio-position',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'trading/portfolio-position/:clientId',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'management/client-search',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'management/client-information',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: 'management/client-information/:clientId',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: ':section/:screen',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      },
      {
        path: '**',
        loadComponent: () =>
          import('./core/layout/workspace/workspace-page.component').then((m) => m.WorkspacePageComponent)
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];

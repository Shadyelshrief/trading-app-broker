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
        path: 'pricing/charts',
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

import { Routes } from '@angular/router';

export const clientsRoutes: Routes = [
  {
    path: 'client-search',
    loadComponent: () =>
      import('./client-search/client-search.component').then((m) => m.ClientSearchComponent)
  },
  {
    path: 'client-information',
    loadComponent: () =>
      import('./client-information/client-information.component').then((m) => m.ClientInformationComponent)
  },
  {
    path: 'client-information/:clientId',
    loadComponent: () =>
      import('./client-information/client-information.component').then((m) => m.ClientInformationComponent)
  }
];

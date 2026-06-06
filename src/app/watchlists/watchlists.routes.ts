import { Routes } from '@angular/router';

import { WatchlistsPageComponent } from './pages/watchlists-page.component';
import { SavedWatchListComponent } from './saved-watch-list/saved-watch-list.component';

export const WATCHLISTS_ROUTES: Routes = [
  {
    path: '',
    component: WatchlistsPageComponent
  },
  {
    path: 'create',
    component: WatchlistsPageComponent,
    data: { action: 'create' }
  },
  {
    path: ':id',
    component: SavedWatchListComponent
  }
];

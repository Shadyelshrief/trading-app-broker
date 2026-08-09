import { ColDef } from 'ag-grid-community';

import { formatClientDisplay } from '../../shared/utils/client-display.util';
import type { ClientSearchResult } from './client-search.models';

export function createClientSearchColumns(): ColDef<ClientSearchResult>[] {
  return [
    {
      headerName: 'Client',
      valueGetter: (params) => params.data ? formatClientDisplay(params.data) : '',
      pinned: 'left',
      flex: 1,
      minWidth: 260,
      cellClass: 'client-cell--primary'
    }
  ];
}

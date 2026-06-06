import { ColDef } from 'ag-grid-community';

import type { ClientSearchResult } from './client-search.models';

export function createClientSearchColumns(): ColDef<ClientSearchResult>[] {
  return [
    {
      headerName: 'Client ID',
      field: 'clientId',
      pinned: 'left',
      minWidth: 160,
      cellClass: 'client-cell--primary'
    },
    {
      headerName: 'Client Name',
      field: 'clientName',
      flex: 1,
      minWidth: 260,
      cellClass: 'client-cell--name'
    }
  ];
}

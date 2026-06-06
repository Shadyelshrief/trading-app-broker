import { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { CashAccount, ClientPortfolio, MarketAccount } from './client-information.models';

export function createClientPortfolioColumns(): ColDef<ClientPortfolio>[] {
  return [
    { headerName: 'Portfolio', field: 'portfolio', pinned: 'left', minWidth: 190 },
    { headerName: 'Custody Type', field: 'custodyType', minWidth: 170 },
    {
      headerName: 'Markets Accounts',
      field: 'marketsAccounts',
      minWidth: 180,
      sortable: false,
      filter: false,
      cellRenderer: () => '<button class="client-link-cell" type="button">Markets Accounts</button>'
    },
    {
      headerName: 'Cash Accounts',
      field: 'cashAccounts',
      minWidth: 170,
      sortable: false,
      filter: false,
      cellRenderer: () => '<button class="client-link-cell" type="button">Cash Accounts</button>'
    }
  ];
}

export function createMarketAccountColumns(): ColDef<MarketAccount>[] {
  return [
    { headerName: 'Market Name', field: 'marketName', flex: 1, minWidth: 220 },
    { headerName: 'Market Acc. No.', field: 'marketAccountNumber', flex: 1, minWidth: 190 }
  ];
}

export function createCashAccountColumns(): ColDef<CashAccount>[] {
  return [
    { headerName: 'Settlement Acc. No.', field: 'settlementAccountNumber', flex: 1, minWidth: 220 },
    { headerName: 'Cash Type', field: 'cashType', minWidth: 160 },
    { headerName: 'Currency', field: 'currency', minWidth: 130 }
  ];
}

export function accountCountFormatter(params: ValueFormatterParams<ClientPortfolio, unknown[]>): string {
  return `${params.value?.length ?? 0}`;
}

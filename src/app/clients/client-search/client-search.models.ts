export interface ClientSearchFilters {
  clientId?: string;
  clientName?: string;
  idType?: string;
  idNumber?: string;
  status?: 'ACTIVE' | 'DORMANT' | 'SUSPENDED';
  address?: string;
  city?: string;
  poBox?: string;
  postalCode?: string;
  telephone?: string;
  mobile?: string;
  email?: string;
}

export interface ClientSearchResult {
  clientId: string;
  clientName: string;
  friendlyId?: string;
}

export interface ClientSearchViewModel {
  rows: readonly ClientSearchResult[];
  loading: boolean;
  error?: string;
}

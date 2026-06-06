import type { ClientSearchResult } from '../client-search/client-search.models';

export interface ClientInformation {
  clientId: string;
  clientName: string;
  idType: string;
  idNumber: string;
  status: string;
  address: string;
  city: string;
  poBox: string;
  postalCode: string;
  telephone: string;
  mobile: string;
  portfolios: ClientPortfolio[];
  deliveryChannels: DeliveryChannel[];
}

export interface ClientPortfolio {
  portfolio: string;
  portfolioId: string;
  custodyType: string;
  marketsAccounts: MarketAccount[];
  cashAccounts: CashAccount[];
}

export interface MarketAccount {
  marketName: string;
  marketAccountNumber: string;
}

export interface CashAccount {
  settlementAccountNumber: string;
  cashType: string;
  currency: string;
}

export interface DeliveryChannel {
  deliveryChannelId: string;
  deliveryChannelName: string;
  loginIds: string[];
}

export interface DeliveryChannelDetails {
  agentId: string;
  idType: string;
  tradeType: string;
  orderLimit: number;
  status: string;
  expiryDate: string;
}

export interface ClientInformationViewModel {
  clientOptions: readonly ClientSearchResult[];
  selectedClient: ClientInformation | null;
  portfolios: readonly ClientPortfolio[];
  deliveryChannels: readonly DeliveryChannel[];
  deliveryDetails: DeliveryChannelDetails | null;
  selectedDeliveryChannelId: string;
  selectedLoginId: string;
  loading: boolean;
  error?: string;
}

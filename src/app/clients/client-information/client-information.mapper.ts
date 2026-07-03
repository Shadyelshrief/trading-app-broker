import {
  mapArray,
  mapClientSearchResult,
  toNumber,
  toRecord,
  toString
} from '../client-search/client-search.mapper';
import type { ClientSearchResult } from '../client-search/client-search.models';
import type {
  CashAccount,
  ClientInformation,
  ClientPortfolio,
  DeliveryChannel,
  DeliveryChannelDetails,
  MarketAccount
} from './client-information.models';

export function mapClientOptionsResponse(response: unknown): ClientSearchResult[] {
  return mapArray(response).map(mapClientSearchResult).filter((row): row is ClientSearchResult => row !== null);
}

export function mapClientInformationResponse(response: unknown): ClientInformation {
  const record = toRecord(response) ?? {};
  const clientId = toString(record['clientId'] ?? record['id']) ?? '';

  return {
    clientId,
    clientName: toString(record['clientName'] ?? record['name']) ?? clientId,
    idType: toString(record['idType'] ?? record['id_type']) ?? '',
    idNumber: toString(record['idNumber'] ?? record['id_number']) ?? '',
    status: toString(record['status']) ?? '',
    address: toString(record['address']) ?? '',
    city: toString(record['city']) ?? '',
    poBox: toString(record['poBox'] ?? record['po_box']) ?? '',
    postalCode: toString(record['postalCode'] ?? record['postal_code']) ?? '',
    telephone: toString(record['telephone'] ?? record['phone']) ?? '',
    mobile: toString(record['mobile']) ?? '',
    portfolios: mapClientPortfoliosResponse(record['portfolios']),
    deliveryChannels: mapDeliveryChannelsResponse(record['deliveryChannels'] ?? record['delivery_channels'])
  };
}

export function mapClientPortfoliosResponse(response: unknown): ClientPortfolio[] {
  return mapArray(response).map(mapPortfolio).filter((row): row is ClientPortfolio => row !== null);
}

export function mapMarketAccountsResponse(response: unknown): MarketAccount[] {
  return mapArray(response).map(mapMarketAccount).filter((row): row is MarketAccount => row !== null);
}

export function mapCashAccountsResponse(response: unknown): CashAccount[] {
  return mapArray(response).map(mapCashAccount).filter((row): row is CashAccount => row !== null);
}

export function mapDeliveryChannelsResponse(response: unknown): DeliveryChannel[] {
  return mapArray(response).map(mapDeliveryChannel).filter((row): row is DeliveryChannel => row !== null);
}

export function mapDeliveryChannelDetailsResponse(response: unknown): DeliveryChannelDetails {
  const record = toRecord(response) ?? {};

  return {
    agentId: toString(record['agentId'] ?? record['agent_id']) ?? '',
    idType: toString(record['idType'] ?? record['id_type']) ?? '',
    tradeType: toString(record['tradeType'] ?? record['trade_type']) ?? '',
    orderLimit: toNumber(record['orderLimit'] ?? record['order_limit']) ?? 0,
    status: toString(record['status']) ?? '',
    expiryDate: toString(record['expiryDate'] ?? record['expiry_date']) ?? ''
  };
}

function mapPortfolio(value: unknown): ClientPortfolio | null {
  const record = toRecord(value);
  const portfolio = toString(record?.['portfolio'] ?? record?.['portfolioName'] ?? record?.['name']);
  const portfolioId = toString(record?.['portfolioId'] ?? record?.['id'] ?? portfolio);

  return portfolio
    ? {
        portfolio,
        portfolioId: portfolioId ?? portfolio,
        custodyType: toString(record?.['custodyType'] ?? record?.['custody_type'] ?? record?.['type']) ?? '',
        marketsAccounts: mapMarketAccountsResponse(record?.['marketsAccounts'] ?? record?.['marketAccounts']),
        cashAccounts: mapCashAccountsResponse(record?.['cashAccounts'])
      }
    : null;
}

function mapMarketAccount(value: unknown): MarketAccount | null {
  const record = toRecord(value);
  const marketName = toString(record?.['marketName'] ?? record?.['market_name'] ?? record?.['name']);
  return marketName
    ? {
        marketName,
        marketAccountNumber: toString(record?.['marketAccountNumber'] ?? record?.['marketAccNo'] ?? record?.['market_acc_no']) ?? ''
      }
    : null;
}

function mapCashAccount(value: unknown): CashAccount | null {
  const record = toRecord(value);
  const settlementAccountNumber = toString(
    record?.['settlementAccountNumber'] ?? record?.['settlementAccNo'] ?? record?.['settlement_acc_no']
  );
  return settlementAccountNumber
    ? {
        settlementAccountNumber,
        cashType: toString(record?.['cashType'] ?? record?.['cash_type']) ?? '',
        currency: toString(record?.['currency']) ?? ''
      }
    : null;
}

function mapDeliveryChannel(value: unknown): DeliveryChannel | null {
  const record = toRecord(value);
  const deliveryChannelId = toString(record?.['deliveryChannelId'] ?? record?.['id']);
  return deliveryChannelId
    ? {
        deliveryChannelId,
        deliveryChannelName: toString(record?.['deliveryChannelName'] ?? record?.['name']) ?? deliveryChannelId,
        loginIds: mapArray(record?.['loginIds'] ?? record?.['logins']).map((item) => toString(item)).filter((item): item is string => !!item)
      }
    : null;
}

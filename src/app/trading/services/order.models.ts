import type { WebSocketState } from '../../core/market-data';

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'LIMIT' | 'MARKET' | 'TAKE' | 'HIT';
export type GoodTill = 'DAY' | 'GTW' | 'GTM' | 'GTD' | 'FOK' | 'GTC' | 'FAK' | 'AT_OPENING' | 'GTT';
export type FillTerm = 'MARKET_DEFAULT' | 'AON' | 'MF' | 'MB';

export interface ClientOption {
  clientId: string;
  clientName: string;
}

export interface PortfolioOption {
  portfolioId: string;
  portfolioName: string;
  currency: string;
}

export interface CashAccountOption {
  cashAccountId: string;
  cashAccountName: string;
  currency: string;
}

export interface SymbolOption {
  productId?: string;
  marketId?: string;
  symbolId: string;
  symbolName: string;
  symbolShortName: string;
  market: string;
  currency: string;
  tradingEnabled: boolean;
  productEnabled: boolean;
  natPrice?: number;
  midPrice?: number;
}

export interface LookupOption {
  label: string;
  value: string;
}

export interface OrderLookups {
  orderSides: LookupOption[];
  orderTypes: LookupOption[];
  goodTillOptions: LookupOption[];
  fillTerms: LookupOption[];
  custodians: LookupOption[];
  markets: LookupOption[];
  statuses: LookupOption[];
  statusGroups: LookupOption[];
  maxExpiryDate?: string;
}

export interface SymbolOrderOptions {
  orderTypes: LookupOption[];
  goodTillOptions: LookupOption[];
  custodians: LookupOption[];
  fillTerms: LookupOption[];
  maxExpiryDate?: string;
  warning?: string;
}

export interface OrderEntryForm {
  clientId: string;
  portfolioId: string;
  cashAccountId: string;
  symbolId: string;
  market: string;
  orderSide: OrderSide;
  orderType: OrderType;
  quantity?: number;
  orderPrice?: number;
  tradeAmount?: number;
  goodTill: GoodTill;
  expiryDate?: string;
  custodianId: string;
  fillTerm: FillTerm;
  minQuantity?: number;
  disclosedVolume?: number;
}

export interface OrderRequest extends OrderEntryForm {
  password?: string;
}

export interface CalculateRequest {
  symbolId: string;
  market: string;
  orderSide: OrderSide;
  tradeAmount: number;
}

export interface OrderCalculationResult {
  quantity: number;
  orderPrice: number;
  tradeAmount: number;
  fees: number;
  orderAmount: number;
}

export interface OrderActionResult {
  success: boolean;
  message: string;
  orderNumber?: string;
  orderAmount?: number;
  orderTradeAmount?: number;
  orderFees?: number;
}

export interface OrderSearchRequest {
  clientId?: string;
  market?: string;
  symbolId?: string;
  type?: string;
  portfolioId?: string;
  fromDate?: string;
  toDate?: string;
  orderNumber?: string;
  status?: string;
}

export interface OrderMonitoringRow {
  orderNumber: string;
  clientId: string;
  clientName: string;
  portfolio: string;
  portfolioId?: string;
  status: string;
  orderType: string;
  orderSide?: OrderSide;
  symbolId: string;
  symbolShortName: string;
  symbolName: string;
  market?: string;
  price: number | string;
  currency: string;
  quantity: number;
  executedQuantity: number;
  remainingQuantity: number;
  expiryDate: string;
  removedFromSystem: boolean;
  updatedAt: number;
  raw?: unknown;
}

export interface OrderModificationRequest {
  orderNumber: string;
  orderType: string;
  quantity: number;
  orderPrice?: number;
  goodTill: string;
  custodianId: string;
  fillTerm: string;
  minQuantity?: number;
  disclosedVolume?: number;
  password?: string;
}

export interface OrderActionRequest {
  orderNumber: string;
  reason?: string;
  password?: string;
}

export interface OrderStatisticsRequest {
  clientId?: string;
  market?: string;
  symbolId?: string;
  orderType?: string;
  portfolioId?: string;
  fromDate?: string;
  toDate?: string;
  brokerId?: string;
  statusGroup?: string;
}

export interface OrderStatisticsRow {
  orderCount: number;
  totalSellValueActive: number;
  totalSellValueExecuted: number;
  totalSellQuantityActive: number;
  totalSellQuantityExecuted: number;
  totalBuyValueActive: number;
  totalBuyValueExecuted: number;
  totalBuyQuantityActive: number;
  totalBuyQuantityExecuted: number;
  totalCommission: number;
  currency: string;
  netPositionActive: number;
  netPositionExecuted: number;
}

export interface OrderFeedConfig {
  topics: string[];
  clientIds: string[];
  portfolioIds: string[];
  brokerIds: string[];
}

export interface OrderFeedState {
  connectionState: WebSocketState;
  missingFeedConfig: boolean;
}

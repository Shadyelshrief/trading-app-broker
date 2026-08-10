import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import type { WebSocketState } from '../../core/market-data';
import type { CashDetailsRow, CashPositionSummary } from '../cash-details/cash-details.models';

export interface ClientOption {
  clientId: string;
  clientName: string;
  friendlyId?: string;
}

export interface PortfolioOption {
  portfolioId: string;
  portfolioName: string;
  currency: string;
}

export interface PortfolioPositioningRequest {
  clientId: string;
  portfolioId: string;
}

export interface PortfolioPositionRow {
  marketShortName: string;
  exchange: string;
  symbolId: string;
  symbolName: string;
  currency: string;
  averageCost: number;
  evaluationPrice: number;
  quantity: number;
  pledged: number;
  available: number;
  cost: number;
  marketValue: number;
  unrealizedGainLoss: number;
  costCcc: number;
  marketValueCcc: number;
  unrealizedGainLossCcc: number;
  outstanding: number;
  outstandingBuyUnits: number;
  inTransfer: number;
  allocated: number;
  allocatedInTransit: number;
  availableAllocationStock: number;
  dayAllocatedQuantity: number;
  dayAllocationInTransit: number;
  outsellUnitsSameDay: number;
  outstandingBuyAmount: number;
  unsettledBuyIn: number;
  unsettledBuyOut: number;
  unsettledSellUnits: number;
  removedFromSystem: boolean;
  updatedAt: number;
  priceDirection: 'UP' | 'DOWN' | 'UNCHANGED';
}

export interface PortfolioTotals {
  totalCostCcc: number;
  totalMarketValueCcc: number;
  totalUnrealizedGainLossCcc: number;
}

export interface PortfolioPositioningViewModel {
  clientOptions: readonly ClientOption[];
  selectedClient: ClientOption | null;
  portfolioOptions: readonly PortfolioOption[];
  selectedPortfolio: PortfolioOption | null;
  positionCurrency: string;
  rows: readonly PortfolioPositionRow[];
  wallets: readonly CashDetailsRow[];
  cashSummary: CashPositionSummary | null;
  totals: PortfolioTotals;
  loading: boolean;
  error?: string;
  validationError?: string;
  connectionState: WebSocketState;
  lastUpdated?: number;
  settings: MarketGridSettings;
}

export interface PortfolioPositioningSnapshot {
  rows: readonly PortfolioPositionRow[];
  wallets: readonly CashDetailsRow[];
  cashSummary: CashPositionSummary;
}

export interface PortfolioTickPayload {
  lastPrice?: number;
  last_price?: number;
  evaluationPrice?: number;
  price?: number;
  close?: number;
  timestamp?: number | string;
}

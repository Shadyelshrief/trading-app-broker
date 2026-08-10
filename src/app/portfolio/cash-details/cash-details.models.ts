export interface CashDetailsRow {
  walletId: string;
  walletName: string;
  currency: string;
  isMargin: boolean;
  availableAmount: number;
  blockedAmount: number;
  coverRatio: number;
  holdingMarketValue: number;
  limitAmount: number;
  marginableValue: number;
  pendingBuyAmount: number;
  ppMargin: number;
  purchasingPower: number;
  reservedSellAmount: number;
  unsettledBuyAmount: number;
  unsettledSellAmount: number;
}

export interface CashPositionSummary {
  currency: string;
  totalCashAvailable: number;
  totalHoldingValue: number;
  totalPurchasingPower: number;
  totalUnsettledBuy: number;
  totalUnsettledSell: number;
  totalPendingBuy: number;
  totalReservedSell: number;
  totalLimit: number;
}

export interface CashDetailsDialogData {
  clientId: string;
  portfolioId: string;
  portfolioCurrency: string;
  wallets: readonly CashDetailsRow[];
  summary: CashPositionSummary;
}

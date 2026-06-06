export interface CashDetailsRow {
  cashAccount: string;
  cashAccountName: string;
  currency: string;
  group: string;
  cashAmount: number;
  blocked: number;
  accountLimit: number;
  purchasePower: number;
  coverageRatio: number;
  buyAmountInTransit: number;
  unsettledBuyUnits: number;
  unsettledSellUnits: number;
  holdingValue: number;
}

export interface CashPositionSummary {
  currency: string;
  cashAmount: number;
  blocked: number;
  accountLimit: number;
  marginableValue: number;
  outstandingBuyOrders: number;
  purchasePower: number;
  coverageRatio: number;
  portfolioValue: number;
}

export interface CashDetailsDialogData {
  clientId: string;
  portfolioId: string;
  portfolioCurrency: string;
}

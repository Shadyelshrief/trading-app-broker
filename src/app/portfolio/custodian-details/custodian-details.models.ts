export interface CustodianDetailsRow {
  custodian: string;
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
  inTransfer: number;
}

export interface CustodianDetailsDialogData {
  clientId: string;
  portfolioId: string;
  exchange: string;
  symbolId: string;
  symbolName: string;
  currency: string;
}

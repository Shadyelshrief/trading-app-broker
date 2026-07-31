import type {
  CashAccountOption,
  ClientOption,
  LookupOption,
  OrderActionResult,
  OrderCalculationResult,
  OrderEntryForm,
  OrderLookups,
  PortfolioOption,
  SymbolOption,
  SymbolOrderOptions
} from '../services/order.models';

export interface OrderEntryViewModel {
  clientOptions: readonly ClientOption[];
  portfolioOptions: readonly PortfolioOption[];
  cashAccountOptions: readonly CashAccountOption[];
  symbolOptions: readonly SymbolOption[];
  lookups: OrderLookups | null;
  symbolOptionsState: SymbolOrderOptions | null;
  selectedClient: ClientOption | null;
  selectedSymbol: SymbolOption | null;
  calculation: OrderCalculationResult | null;
  lastResult: OrderActionResult | null;
  loading: boolean;
  warning?: string;
  error?: string;
}

export interface OrderConfirmationData {
  title: string;
  actionLabel: string;
  order: OrderEntryForm;
  fees: number;
  orderAmount: number;
  expiresOn: string;
  portfolioLabel: string;
  sessionLabel: string;
  requirePassword: boolean;
}

export interface OrderConfirmationResult {
  confirmed: boolean;
  password?: string;
}

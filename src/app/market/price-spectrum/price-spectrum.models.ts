import { SharedSymbolOption } from '../../shared/utils/symbol-reference.util';

export interface SymbolOption extends SharedSymbolOption {}

export interface PriceSpectrumRow {
  price: number;
  bidQuantity?: number;
  bidOrders?: number;
  bidRatioPercent: number;
  offerQuantity?: number;
  offerOrders?: number;
  offerRatioPercent: number;
}

export interface PriceSpectrumSettings {
  bidBackgroundColor: string;
  bidRatioColor: string;
  offerBackgroundColor: string;
  offerRatioColor: string;
  fontFamily: string;
  fontSize: number;
}

export interface PriceSpectrumViewModel {
  symbolId: string;
  symbolName: string;
  market: string;
  currency: string;
  rows: PriceSpectrumRow[];
  totalBidQuantity: number;
  totalBidOrders: number;
  totalOfferQuantity: number;
  totalOfferOrders: number;
  loading: boolean;
  error?: string;
  connectionState: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
  lastUpdated?: number;
  settings: PriceSpectrumSettings;
  symbolOptions: readonly SymbolOption[];
  filteredSymbolOptions: readonly SymbolOption[];
}

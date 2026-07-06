import { MarketGridSettings } from '../../shared/models/market-grid.model';
import { MarketDepthLevel } from '../../shared/utils/market-depth.mapper';
import { MarketDepthOrderType } from '../../shared/utils/market-depth-topic.util';
import { SharedSymbolOption } from '../../shared/utils/symbol-reference.util';

export interface SymbolOption extends SharedSymbolOption {}

export interface MarketDepthViewModel {
  symbolId: string;
  symbolName: string;
  market: string;
  currency: string;
  bids: MarketDepthLevel[];
  offers: MarketDepthLevel[];
  totalBidQuantity: number;
  totalBidOrders: number;
  totalOfferQuantity: number;
  totalOfferOrders: number;
  loading: boolean;
  error?: string;
  connectionState: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED';
  lastUpdated?: number;
  settings: MarketGridSettings;
  symbolOptions: readonly SymbolOption[];
  filteredSymbolOptions: readonly SymbolOption[];
  orderType: MarketDepthOrderType;
}

export interface MarketDepthByOrderFilters {
  symbol: SymbolOption | null;
  orderType: MarketDepthOrderType;
}

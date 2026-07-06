import { WebSocketState } from '../../core/market-data';
import {
  mapMbpMessageToDepthBook,
  ParsedMarketDepthBook
} from '../../shared/utils/market-depth.mapper';
import { SymbolOption } from './market-depth-by-price.models';

export function mapMbpMessageToDepthViewModel(message: unknown): ParsedMarketDepthBook {
  return mapMbpMessageToDepthBook(message);
}

export function mapConnectionState(state: WebSocketState | null): 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED' {
  if (!state) {
    return 'DISCONNECTED';
  }

  if (state.status === 'authenticated' || state.status === 'connected') {
    return 'CONNECTED';
  }

  if (state.status === 'reconnecting') {
    return 'RECONNECTING';
  }

  if (state.status === 'connecting' || state.status === 'authenticating') {
    return 'CONNECTING';
  }

  return 'DISCONNECTED';
}

export function displayDepthSymbol(option: string | SymbolOption | null): string {
  if (!option) {
    return '';
  }

  return typeof option === 'string' ? option : `${option.symbolId} - ${option.symbolName}`;
}

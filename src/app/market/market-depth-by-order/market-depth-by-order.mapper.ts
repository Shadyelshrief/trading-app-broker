import { WebSocketState } from '../../core/market-data';
import {
  mapMboMessageToDepthBook,
  ParsedMarketDepthBook
} from '../../shared/utils/market-depth.mapper';
import { SymbolOption } from './market-depth-by-order.models';

export function mapMboMessageToDepthViewModel(message: unknown): ParsedMarketDepthBook {
  return mapMboMessageToDepthBook(message);
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

export function mapConnectionLabel(
  state: 'CONNECTED' | 'CONNECTING' | 'RECONNECTING' | 'DISCONNECTED'
): string {
  switch (state) {
    case 'CONNECTED':
      return 'Feed live';
    case 'RECONNECTING':
      return 'Reconnecting...';
    case 'CONNECTING':
      return 'Connecting...';
    default:
      return 'Disconnected';
  }
}

export function displayDepthSymbol(option: string | SymbolOption | null): string {
  if (!option) {
    return '';
  }

  return typeof option === 'string' ? option : `${option.symbolId} - ${option.symbolName}`;
}

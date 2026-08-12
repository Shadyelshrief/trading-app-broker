/**
 * Builds a workspace screen descriptor from a market grid context-menu action id
 * and the clicked row, so grids can route screen actions through
 * `WorkspaceLayoutService.openScreen(...)` (modal, or a panel for charts).
 *
 * Returns `null` for actions that are not screen navigations (grid utilities,
 * watch-list actions, and `quote` — which the grid opens as a dialog itself).
 */
export interface ScreenActionDescriptor {
  type: string;
  state: {
    title: string;
    route: string;
    section: string;
    screen: string;
    context?: Record<string, unknown>;
  };
}

interface ScreenActionSymbol {
  market: string;
  symbolId: string;
  symbolName: string;
}

export function buildScreenActionDescriptor(
  actionId: string,
  row: unknown
): ScreenActionDescriptor | null {
  if (actionId === 'chart') {
    return {
      type: 'charts',
      state: {
        title: 'Charts',
        route: '/app/pricing/charts',
        section: 'pricing',
        screen: 'charts'
      }
    };
  }

  const symbol = toScreenActionSymbol(row);

  if (!symbol) {
    return null;
  }

  const market = symbol.market.toLowerCase();
  const id = symbol.symbolId.toLowerCase();

  switch (actionId) {
    case 'depth-order':
    case 'depth-order-special':
      return screen('market-depth-by-order', 'Order Book', '/app/pricing/market-depth-by-order', symbol);
    case 'depth-price':
      return screen('market-depth-by-price', 'Depth by Price', '/app/pricing/market-depth-by-price', symbol);
    case 'spectrum':
      return screen('price-spectrum', 'Spectrum', '/app/pricing/price-spectrum', symbol);
    case 'time-sales':
      return screen('time-sales', 'Time & Sales', '/app/pricing/time-and-sales', symbol);
    case 'news':
      return screen('news-announcements', 'News & Corporate Actions', '/app/pricing/news-announcements', symbol);
    case 'buy':
    case 'sell':
      return {
        type: 'order-entry',
        state: {
          title: `${actionId === 'buy' ? 'Buy' : 'Sell'} Order - ${symbol.symbolId}`,
          route: `/app/trading/order-entry/${actionId}/${market}/${id}`,
          section: 'trading',
          screen: 'order-entry',
          context: { side: actionId, order: symbol }
        }
      };
    default:
      return null;
  }
}

function screen(
  type: string,
  title: string,
  route: string,
  symbol: ScreenActionSymbol
): ScreenActionDescriptor {
  return {
    type,
    state: { title, route, section: 'pricing', screen: type, context: { symbol } }
  };
}

function toScreenActionSymbol(row: unknown): ScreenActionSymbol | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const record = row as Record<string, unknown>;
  const symbolId = firstString(record, ['symbolId', 'symbol', 'securityId', 'symbolShortName']);

  if (!symbolId) {
    return null;
  }

  const market =
    firstString(record, ['market', 'exchange', 'marketShortName', 'marketCode', 'marketName']) ?? 'ADX';
  const symbolName =
    firstString(record, ['symbolName', 'securityName', 'assetName', 'name']) ?? symbolId;

  return { ...record, market, symbolId, symbolName } as ScreenActionSymbol;
}

function firstString(record: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

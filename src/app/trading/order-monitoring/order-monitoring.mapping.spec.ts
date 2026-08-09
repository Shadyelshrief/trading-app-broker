import { mapOrderSearchResponse } from '../services/order.mapper';
import { createOrderMonitoringColumns } from './order-monitoring.columns';

describe('order monitoring response mapping', () => {
  it('maps the client and portfolio friendly values returned by the API', () => {
    const rows = mapOrderSearchResponse({
      status: 'SUCCESS',
      body: {
        data: [
          {
            id: '019dfdc0-ea57-7e85-9c8c-69d2258903fd',
            friendlyId: 16,
            marketName: 'Dubai Financial MarketModels',
            symbolName: 'DU',
            status: 'FILLED',
            orderType: 'MARKET',
            direction: 'BUY',
            quantity: 70700,
            price: 10.19950495,
            executedQuantity: 70700,
            createdAt: '2026-08-07T19:43:55.478781Z',
            clientName: 'yasin Ahmed',
            clientFriendlyId: 28,
            portfolioFriendlyId: 'Main Portfolio'
          }
        ]
      }
    });

    expect(rows.length).toBe(1);
    expect(rows[0].clientFriendlyId).toBe('28');
    expect(rows[0].clientName).toBe('yasin Ahmed');
    expect(rows[0].portfolio).toBe('Main Portfolio');
  });

  it('does not include the Symbol Short Name column', () => {
    const columns = createOrderMonitoringColumns();

    expect(columns.some((column) => column.field === 'symbolShortName')).toBeFalse();
    expect(columns.some((column) => column.field === 'clientFriendlyId')).toBeTrue();
  });
});

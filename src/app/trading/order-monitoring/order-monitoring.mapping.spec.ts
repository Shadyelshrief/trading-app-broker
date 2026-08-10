import { mapMonitoringRowToOrderDetails, mapOrderActionResponse, mapOrderSearchResponse } from '../services/order.mapper';
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

  it('builds transaction details from the selected order when no detail endpoint exists', () => {
    const [row] = mapOrderSearchResponse({
      body: {
        data: [{
          id: '019fc930-4cbd-7422-ace1-b9a0dad7281b',
          marketName: 'ADX',
          symbolName: 'ADCB',
          status: 'FILLED',
          orderType: 'MARKET',
          direction: 'BUY',
          quantity: 1000,
          price: 0.13,
          executedQuantity: 1000,
          createdAt: '2026-08-03T19:43:55.478781Z',
          clientName: 'Nanis Mohamed',
          clientFriendlyId: 9,
          portfolioFriendlyId: 'Main Portfolio'
        }]
      }
    });

    const details = mapMonitoringRowToOrderDetails(row);

    expect(details.orderNumber).toBe('019fc930-4cbd-7422-ace1-b9a0dad7281b');
    expect(details.status).toBe('FILLED');
    expect(details.order.portfolio).toBe('Main Portfolio');
    expect(details.order.company).toBe('ADCB');
    expect(details.orderInfo.orderQuantity).toBe(1000);
    expect(details.executionInfo.executedQuantity).toBe(1000);
    expect(details.transactions.length).toBe(1);
    expect(details.transactions[0].status).toBe('FILLED');
  });

  it('treats backend validation and fatal responses as failed actions', () => {
    expect(mapOrderActionResponse({ status: 'SUCCESS', message: 'Done' }).success).toBeTrue();
    expect(mapOrderActionResponse({ status: 'VALIDATION_FAIL', message: 'Invalid' }).success).toBeFalse();
    expect(mapOrderActionResponse({ status: 'FATAL_CRASH', message: 'Failed' }).success).toBeFalse();
  });
});

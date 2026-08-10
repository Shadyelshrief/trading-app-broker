import {
  calculateCashPositionSummary,
  mapPortfolioPositioningResponse
} from './portfolio-positioning.mapper';

describe('portfolio positioning response mapping', () => {
  it('maps holdings, wallets, and the server summary from one response', () => {
    const snapshot = mapPortfolioPositioningResponse({
      status: 'SUCCESS',
      body: {
        holdings: [
          {
            symbol: 'IHC',
            marketName: 'Abu Dhabi Securities Exchange',
            currencyId: '019fc66c-c123-7000-8000-000000000001',
            totalQty: 10,
            evaluationPrice: 4.3
          }
        ],
        summary: {
          totalCashAvailable: 269398.075,
          totalHoldingValue: 43000.7908,
          totalPurchasingPower: 269398.075
        },
        wallets: [
          {
            walletId: '59400b05-33b3-4b18-81b1-8b51109c864a',
            walletName: 'AED Wallet',
            isMargin: false,
            availableAmount: 269398.075,
            blockedAmount: 1463676.2875,
            coverRatio: 0,
            holdingMarketValue: 43000.7908,
            limitAmount: 0,
            marginableValue: 0,
            pendingBuyAmount: 0,
            ppMargin: 0,
            purchasingPower: 269398.075,
            reservedSellAmount: 0,
            unsettledBuyAmount: 1463676.2875,
            unsettledSellAmount: 0
          }
        ]
      }
    });

    expect(snapshot.rows.length).toBe(1);
    expect(snapshot.rows[0].currency).toBe('AED');
    expect(snapshot.wallets).toEqual([
      jasmine.objectContaining({
        walletName: 'AED Wallet',
        availableAmount: 269398.075,
        holdingMarketValue: 43000.7908,
        purchasingPower: 269398.075,
        reservedSellAmount: 0,
        unsettledBuyAmount: 1463676.2875
      })
    ]);
    expect(snapshot.cashSummary).toEqual({
      currency: 'AED',
      totalCashAvailable: 269398.075,
      totalHoldingValue: 43000.7908,
      totalPurchasingPower: 269398.075,
      totalUnsettledBuy: 1463676.2875,
      totalUnsettledSell: 0,
      totalPendingBuy: 0,
      totalReservedSell: 0,
      totalLimit: 0
    });
  });

  it('calculates a currency summary from filtered wallet rows', () => {
    const summary = calculateCashPositionSummary(
      [
        {
          walletId: 'wallet-1',
          walletName: 'AED Wallet',
          currency: 'AED',
          isMargin: false,
          availableAmount: 100,
          blockedAmount: 5,
          coverRatio: 0,
          holdingMarketValue: 50,
          limitAmount: 0,
          marginableValue: 0,
          pendingBuyAmount: 0,
          ppMargin: 0,
          purchasingPower: 95,
          reservedSellAmount: 3,
          unsettledBuyAmount: 0,
          unsettledSellAmount: 2
        }
      ],
      'AED'
    );

    expect(summary).toEqual({
      currency: 'AED',
      totalCashAvailable: 100,
      totalHoldingValue: 50,
      totalPurchasingPower: 95,
      totalUnsettledBuy: 0,
      totalUnsettledSell: 2,
      totalPendingBuy: 0,
      totalReservedSell: 3,
      totalLimit: 0
    });
  });
});

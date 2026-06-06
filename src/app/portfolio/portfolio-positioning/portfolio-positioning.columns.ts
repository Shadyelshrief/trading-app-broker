import type { ColDef, ValueFormatterParams } from 'ag-grid-community';

import type { PortfolioPositionRow } from './portfolio-positioning.models';

export function createPortfolioPositioningColumns(): ColDef<PortfolioPositionRow>[] {
  return [
    textColumn('Market Short Name', 'marketShortName', 155),
    {
      headerName: 'Symbol',
      field: 'symbolId',
      minWidth: 150,
      pinned: 'left',
      cellClass: symbolCellClass,
      tooltipValueGetter: (params) => params.data?.symbolName
    },
    textColumn('Currency', 'currency', 110),
    moneyColumn('Average Cost', 'averageCost', 140),
    {
      ...moneyColumn('Evaluation Price', 'evaluationPrice', 155),
      cellClass: priceCellClass
    },
    numberColumn('Quantity', 'quantity', 130),
    numberColumn('Pledged', 'pledged', 120),
    numberColumn('Available', 'available', 130),
    moneyColumn('Cost', 'cost', 130),
    moneyColumn('Market Value', 'marketValue', 150),
    gainLossColumn('Unrealized Gain/Loss', 'unrealizedGainLoss', 190),
    moneyColumn('Cost (CCC)', 'costCcc', 145),
    moneyColumn('Market Value (CCC)', 'marketValueCcc', 185),
    gainLossColumn('Unrealized Gain/Loss (CCC)', 'unrealizedGainLossCcc', 230),
    numberColumn('Outstanding', 'outstanding', 145),
    numberColumn('Outstanding Buy Units', 'outstandingBuyUnits', 190),
    numberColumn('In Transfer', 'inTransfer', 140),
    numberColumn('Allocated', 'allocated', 130),
    numberColumn('Allocated In Transit', 'allocatedInTransit', 185),
    numberColumn('Available Allocation Stock', 'availableAllocationStock', 220),
    numberColumn('Day Allocated Quantity', 'dayAllocatedQuantity', 205),
    numberColumn('Day Allocation In Transit', 'dayAllocationInTransit', 215),
    numberColumn('Outsell Units Same Day', 'outsellUnitsSameDay', 205),
    moneyColumn('Outstanding Buy Amount', 'outstandingBuyAmount', 205),
    numberColumn('Unsettled Buy In', 'unsettledBuyIn', 165),
    numberColumn('Unsettled Buy Out', 'unsettledBuyOut', 175),
    numberColumn('Unsettled Sell Units', 'unsettledSellUnits', 185)
  ];
}

function textColumn(headerName: string, field: keyof PortfolioPositionRow, minWidth: number): ColDef<PortfolioPositionRow> {
  return {
    headerName,
    field,
    minWidth,
    cellClass: removedCellClass
  };
}

function moneyColumn(headerName: string, field: keyof PortfolioPositionRow, minWidth: number): ColDef<PortfolioPositionRow> {
  return {
    headerName,
    field,
    minWidth,
    type: 'rightAligned',
    valueFormatter: moneyFormatter,
    cellClass: removedCellClass
  };
}

function numberColumn(headerName: string, field: keyof PortfolioPositionRow, minWidth: number): ColDef<PortfolioPositionRow> {
  return {
    headerName,
    field,
    minWidth,
    type: 'rightAligned',
    valueFormatter: integerFormatter,
    cellClass: removedCellClass
  };
}

function gainLossColumn(headerName: string, field: keyof PortfolioPositionRow, minWidth: number): ColDef<PortfolioPositionRow> {
  return {
    headerName,
    field,
    minWidth,
    type: 'rightAligned',
    valueFormatter: moneyFormatter,
    cellClass: gainLossCellClass
  };
}

function symbolCellClass(params: { data?: PortfolioPositionRow }): string {
  return params.data?.removedFromSystem ? 'portfolio-cell--removed' : priceCellClass(params);
}

function priceCellClass(params: { data?: PortfolioPositionRow }): string {
  if (params.data?.removedFromSystem) {
    return 'portfolio-cell--removed';
  }

  switch (params.data?.priceDirection) {
    case 'UP':
      return 'market-cell--up';
    case 'DOWN':
      return 'market-cell--down';
    default:
      return 'market-cell--flat';
  }
}

function gainLossCellClass(params: { value?: unknown; data?: PortfolioPositionRow }): string {
  if (params.data?.removedFromSystem) {
    return 'portfolio-cell--removed';
  }

  const value = typeof params.value === 'number' ? params.value : 0;

  if (value > 0) {
    return 'market-cell--up';
  }

  if (value < 0) {
    return 'market-cell--down';
  }

  return 'market-cell--flat';
}

function removedCellClass(params: { data?: PortfolioPositionRow }): string {
  return params.data?.removedFromSystem ? 'portfolio-cell--removed' : '';
}

function moneyFormatter(params: ValueFormatterParams<PortfolioPositionRow, number>): string {
  return formatNumber(params.value, 2);
}

function integerFormatter(params: ValueFormatterParams<PortfolioPositionRow, number>): string {
  return formatNumber(params.value, 0);
}

function formatNumber(value: number | null | undefined, digits: number): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value ?? 0);
}

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import {
  getWatchListSymbolUniverse
} from '../saved-watch-list/saved-watch-list.mapper';
import {
  ClientOption,
  PortfolioOption,
  SymbolOption,
  WatchListConfig
} from '../saved-watch-list/saved-watch-list.models';
import { WatchListService } from '../services/watch-list.service';
import { validateWatchListConfig } from './create-watch-list.validators';
import { WatchListSourceOption } from './create-watch-list.models';

@Injectable()
export class CreateWatchListFacade {
  private readonly service = inject(WatchListService);

  readonly sourceOptions: readonly WatchListSourceOption[] = [
    { label: 'All Symbols', value: 'ALL_SYMBOLS' },
    { label: 'Filter', value: 'FILTER' },
    { label: 'Selected Symbols', value: 'SELECTED_SYMBOLS' }
  ];
  readonly marketOptions = [
    { label: 'All Markets', value: 'all' },
    { label: 'Saudi Arabian Stock Market', value: 'tadawul' },
    { label: 'Dubai Stock Market', value: 'dfm' },
    { label: 'AbuDhabi Stock Market', value: 'adx' }
  ] as const;
  readonly indexOptions = ['All Indexes', 'FADX 15', 'DFMGI', 'TASI'];
  readonly tradingSessionOptions = ['All Sessions', 'Regular', 'Pre Open', 'Pre Close'];
  readonly clientOptions: readonly ClientOption[] = [];
  readonly portfolioOptions: readonly PortfolioOption[] = [];
  readonly conditionFields = [
    { label: 'Bid Price', value: 'bidPrice' },
    { label: 'Last Trade Quantity', value: 'lastTradeQty' },
    { label: 'Turnover', value: 'turnover' },
    { label: 'Total Volume', value: 'totalVolume' },
    { label: 'Last Price', value: 'lastPrice' },
    { label: 'Change %', value: 'changePercent' },
    { label: 'Change', value: 'change' },
    { label: 'Number Of Trades', value: 'numberOfTrades' }
  ] as const;
  readonly operators = ['>', '>=', '<', '<=', '=', '!='] as const;
  readonly joins = ['AND', 'OR'] as const;

  getSymbols(): SymbolOption[] {
    return getWatchListSymbolUniverse();
  }

  getSectors(market: string): string[] {
    const symbols = this.getSymbols().filter(
      (symbol) => market === 'all' || symbol.marketShortName.toLowerCase() === market.toLowerCase()
    );

    return ['all', ...new Set(symbols.map((symbol) => symbol.sector).filter((sector): sector is string => Boolean(sector)))];
  }

  filterSymbols(market: string, sector: string): SymbolOption[] {
    return this.getSymbols().filter((symbol) => {
      const marketMatches = market === 'all' || symbol.marketShortName.toLowerCase() === market.toLowerCase();
      const sectorMatches = sector === 'all' || symbol.sector === sector;
      return marketMatches && sectorMatches;
    });
  }

  save(config: WatchListConfig): Observable<WatchListConfig> {
    const validationError = validateWatchListConfig(config);

    if (validationError) {
      throw new Error(validationError);
    }

    return config.createdAt === config.updatedAt
      ? this.service.createWatchList(config)
      : this.service.updateWatchList(config);
  }

  delete(id: string): Observable<void> {
    return this.service.deleteWatchList(id);
  }
}

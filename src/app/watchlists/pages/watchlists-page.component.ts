import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { map } from 'rxjs';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { FullMarketFacade } from '../../market/full-market/full-market.facade';
import { createFullMarketColumns } from '../../market/full-market/full-market.columns';
import { WatchlistsService } from '../services/watchlists.service';

@Component({
  selector: 'app-watchlists-page',
  standalone: true,
  imports: [AsyncPipe, MarketGridComponent],
  templateUrl: './watchlists-page.component.html',
  styleUrl: './watchlists-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [FullMarketFacade]
})
export class WatchlistsPageComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string }>();

  private readonly facade = inject(FullMarketFacade);
  private readonly watchlists = inject(WatchlistsService);

  protected readonly columns = createFullMarketColumns().filter((column) =>
    ['symbolId', 'symbolName', 'bidPrice', 'offerPrice', 'lastPrice', 'changePercent', 'totalVolume'].includes(
      `${column.field ?? ''}`
    )
  );
  protected readonly vm$ = this.facade.vm$.pipe(
    map((vm) => {
      const symbols = new Set(this.watchlists.getDefaultSymbols());
      return {
        ...vm,
        rows: vm.rows.filter((row) => symbols.has(row.symbolId))
      };
    })
  );

  captureState() {
    return this.state();
  }
}

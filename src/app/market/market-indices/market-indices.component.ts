import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketIndicesConnectionState } from './market-indices.models';
import { MarketIndicesFacade } from './market-indices.facade';

@Component({
  selector: 'app-market-indices',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatFormFieldModule, MatSelectModule, MarketGridComponent],
  templateUrl: './market-indices.component.html',
  styleUrl: './market-indices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketIndicesFacade]
})
export class MarketIndicesComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string }>();

  protected readonly facade = inject(MarketIndicesFacade);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;

  protected selectMarket(market: string): void {
    this.facade.selectMarket(market);
  }

  protected isReconnecting(state: MarketIndicesConnectionState): boolean {
    return state === 'RECONNECTING';
  }

  protected isDisconnected(state: MarketIndicesConnectionState): boolean {
    return state === 'DISCONNECTED';
  }

  captureState() {
    return this.state();
  }
}

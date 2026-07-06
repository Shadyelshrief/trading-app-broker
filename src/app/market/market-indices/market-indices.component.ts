import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { LinkedFilterGroupControlComponent, MarketDropdownComponent } from '../../shared/components';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState
} from '../../shared/services/linked-filter-group.service';
import { MarketIndicesFacade } from './market-indices.facade';

@Component({
  selector: 'app-market-indices',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    LinkedFilterGroupControlComponent,
    MarketDropdownComponent,
    MarketGridComponent
  ],
  templateUrl: './market-indices.component.html',
  styleUrl: './market-indices.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketIndicesFacade]
})
export class MarketIndicesComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(MarketIndicesFacade);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('market-indices');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  private currentMarket = 'all';

  constructor() {
    this.linkedFilters
      .observe<string>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'market')
      .pipe(takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected selectMarket(market: string): void {
    this.applyMarket(market, true);
  }

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      market: this.currentMarket
    });

    if (typeof groupState['market'] === 'string') {
      this.applyMarket(groupState['market'], false);
    }

    this.linkedFilterGroupSubject.next(groupId);
  }

  captureState() {
    const state = this.state();
    const context = { ...(state?.context ?? {}) };

    if (this.linkedFilterGroup()) {
      context['linkedFilterGroup'] = this.linkedFilterGroup();
    } else {
      delete context['linkedFilterGroup'];
    }

    return { ...(state ?? {}), context };
  }

  private applyMarket(market: string, publish: boolean): void {
    const next = market.toLowerCase();

    if (next === this.currentMarket) {
      return;
    }

    this.currentMarket = next;
    this.facade.selectMarket(next);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'market', next);
    }
  }
}

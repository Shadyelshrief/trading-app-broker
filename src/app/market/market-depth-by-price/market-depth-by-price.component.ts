import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { debounceTime } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { LinkedFilterGroupControlComponent } from '../../shared/components';
import { MarketDepthBookComponent } from '../../shared/components/market-depth-book/market-depth-book.component';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState,
  sameLinkedFilterValue
} from '../../shared/services/linked-filter-group.service';
import { MarketDepthLevel } from '../../shared/utils/market-depth.mapper';
import { findSharedSymbolOption, getSharedSymbolOptions, normalizeSharedSymbolOption } from '../../shared/utils/symbol-reference.util';
import { displayDepthSymbol } from './market-depth-by-price.mapper';
import { MarketDepthByPriceFacade } from './market-depth-by-price.facade';
import { SymbolOption } from './market-depth-by-price.models';

@Component({
  selector: 'app-market-depth-by-price',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    LinkedFilterGroupControlComponent,
    MarketDepthBookComponent
  ],
  templateUrl: './market-depth-by-price.component.html',
  styleUrl: './market-depth-by-price.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [MarketDepthByPriceFacade]
})
export class MarketDepthByPriceComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(MarketDepthByPriceFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('market-depth-by-price');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly symbolControl = new FormControl<string | SymbolOption>('IHC - International Holding Company', { nonNullable: true });
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  private currentSymbol: SymbolOption | null = findSharedSymbolOption('IHC', 'ADX') ?? getSharedSymbolOptions()[0];

  constructor() {
    this.symbolControl.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateSymbolQuery(value);
          return;
        }

        this.applySymbol(value, true);
      });

    this.linkedFilters
      .observe<SymbolOption>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'symbol')
      .pipe(takeUntilDestroyed())
      .subscribe((symbol) => this.applySymbol(symbol, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected displaySymbol = displayDepthSymbol;

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      symbol: this.currentSymbol
    });
    const groupSymbol = normalizeSharedSymbolOption(groupState['symbol']);

    if (groupSymbol) {
      this.applySymbol(groupSymbol, false);
    }

    this.linkedFilterGroupSubject.next(groupId);
  }

  protected openOrder(side: 'buy' | 'sell', vm: { market: string; symbolId: string; symbolName: string; currency: string }, level: MarketDepthLevel): void {
    this.workspace.openScreen({
      type: 'placeholder',
      state: {
        title: `${side === 'buy' ? 'Buy' : 'Sell'} Order - ${vm.symbolId}`,
        route: `/app/trading/order-entry/${side}/${vm.market.toLowerCase()}/${vm.symbolId.toLowerCase()}`,
        section: 'trading',
        screen: 'order-entry',
        context: {
          side,
          order: {
            ...vm,
            price: level.price,
            quantity: level.size
          }
        }
      }
    });
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

  private applySymbol(symbol: SymbolOption, publish: boolean): void {
    const nextSymbol = normalizeSharedSymbolOption(symbol) as SymbolOption | null;

    if (!nextSymbol || (this.currentSymbol && sameLinkedFilterValue(this.currentSymbol, nextSymbol))) {
      return;
    }

    this.currentSymbol = nextSymbol;
    this.symbolControl.setValue(nextSymbol, { emitEvent: false });
    this.facade.selectSymbol(nextSymbol);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'symbol', nextSymbol);
    }
  }
}

import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { LinkedFilterGroupControlComponent, MarketDropdownComponent } from '../../shared/components';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import {
  LinkedFilterGroupId,
  LinkedFilterGroupService,
  readLinkedFilterGroupFromState
} from '../../shared/services/linked-filter-group.service';
import { normalizeSharedSymbolOption } from '../../shared/utils/symbol-reference.util';
import { TimeSalesFacade } from './time-sales.facade';
import { SymbolOption, TimeSalesRow } from './time-sales.models';

@Component({
  selector: 'app-time-sales',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LinkedFilterGroupControlComponent,
    MarketDropdownComponent,
    MarketGridComponent
  ],
  templateUrl: './time-sales.component.html',
  styleUrl: './time-sales.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TimeSalesFacade]
})
export class TimeSalesComponent implements OnInit {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(TimeSalesFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly linkedFilters = inject(LinkedFilterGroupService);
  private readonly linkedFilterSourceId = this.linkedFilters.createSourceId('time-sales');
  private readonly linkedFilterGroupSubject = this.linkedFilters.createGroupSubject();
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;
  protected readonly linkedFilterGroup = signal<LinkedFilterGroupId | null>(null);
  protected readonly allSymbolsControl = new FormControl(true, { nonNullable: true });
  protected readonly marketControl = new FormControl<'all' | 'tadawul' | 'dfm' | 'adx'>('all', {
    nonNullable: true
  });
  protected readonly minQuantityControl = new FormControl(0, { nonNullable: true });
  protected readonly symbolControl = new FormControl<string | SymbolOption>({ value: '', disabled: true }, { nonNullable: true });
  private currentAllSymbols = true;
  private currentMarket: 'all' | 'tadawul' | 'dfm' | 'adx' = 'all';
  private currentMinQuantity = 0;
  private currentSymbol: SymbolOption | null = null;
  protected readonly menuActions: MarketGridContextAction<TimeSalesRow>[] = [
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'quote', label: 'Price Quote' },
    { id: 'chart', label: 'Charting' },
    { id: 'depth-price', label: 'Market Depth By Price' },
    { id: 'depth-order', label: 'Market Depth By Order' }
  ];

  constructor() {
    this.allSymbolsControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((checked) => {
        if (checked) {
          this.symbolControl.disable({ emitEvent: false });
          this.symbolControl.setValue('', { emitEvent: false });
        } else {
          this.symbolControl.enable({ emitEvent: false });
        }

        this.currentAllSymbols = checked;
        this.currentSymbol = checked ? null : this.currentSymbol;
        this.facade.setAllSymbols(checked);
        this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'allSymbols', checked);

        if (checked) {
          this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'symbol', null);
        }
      });

    this.marketControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, true));

    this.minQuantityControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.applyMinQuantity(value, true));

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
      .observe<'all' | 'tadawul' | 'dfm' | 'adx'>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'market')
      .pipe(takeUntilDestroyed())
      .subscribe((market) => this.applyMarket(market, false));

    this.linkedFilters
      .observe<boolean>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'allSymbols')
      .pipe(takeUntilDestroyed())
      .subscribe((checked) => this.applyAllSymbols(checked));

    this.linkedFilters
      .observe<number>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'minQuantity')
      .pipe(takeUntilDestroyed())
      .subscribe((value) => this.applyMinQuantity(value, false));

    this.linkedFilters
      .observe<SymbolOption>(this.linkedFilterGroupSubject, this.linkedFilterSourceId, 'symbol')
      .pipe(takeUntilDestroyed())
      .subscribe((symbol) => this.applySymbol(symbol, false));
  }

  ngOnInit(): void {
    this.setLinkedFilterGroup(readLinkedFilterGroupFromState(this.state()));
  }

  protected displaySymbol(option: string | SymbolOption | null): string {
    if (!option) {
      return '';
    }

    return typeof option === 'string' ? option : `${option.symbolId} - ${option.symbolName}`;
  }

  protected setLinkedFilterGroup(groupId: LinkedFilterGroupId | null): void {
    if (groupId === this.linkedFilterGroup()) {
      return;
    }

    this.linkedFilterGroupSubject.next(null);
    this.linkedFilterGroup.set(groupId);
    const groupState = this.linkedFilters.joinGroup(groupId, this.linkedFilterSourceId, {
      market: this.currentMarket,
      allSymbols: this.currentAllSymbols,
      minQuantity: this.currentMinQuantity,
      symbol: this.currentSymbol ? normalizeSharedSymbolOption(this.currentSymbol) : null
    });

    if (isTimeSalesMarket(groupState['market'])) {
      this.applyMarket(groupState['market'], false);
    }

    if (typeof groupState['allSymbols'] === 'boolean') {
      this.applyAllSymbols(groupState['allSymbols']);
    }

    if (typeof groupState['minQuantity'] === 'number') {
      this.applyMinQuantity(groupState['minQuantity'], false);
    }

    if (groupState['symbol']) {
      this.applySymbol(groupState['symbol'], false);
    }

    this.linkedFilterGroupSubject.next(groupId);
  }

  protected openPriceQuote(row: TimeSalesRow): void {
    this.workspace.openPanel({
      type: 'price-quote',
      state: {
        title: `Price Quote - ${row.symbolId}`,
        route: `/app/pricing/price-quote/${row.marketShortName.toLowerCase() === 'tadawul' ? 'tadawul' : row.marketShortName.toLowerCase()}/${row.symbolId.toLowerCase()}`,
        section: 'pricing',
        screen: 'price-quote',
        context: {
          quote: {
            symbolId: row.symbolId,
            symbolName: row.symbolName,
            market: row.marketShortName,
            currency: row.currency,
            direction: row.changeDirection
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

  private applyMarket(market: 'all' | 'tadawul' | 'dfm' | 'adx', publish: boolean): void {
    const next = market.toLowerCase() as 'all' | 'tadawul' | 'dfm' | 'adx';

    if (next === this.currentMarket) {
      return;
    }

    this.currentMarket = next;
    this.marketControl.setValue(next, { emitEvent: false });
    this.facade.selectMarket(next);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'market', next);
    }
  }

  private applyAllSymbols(checked: boolean): void {
    if (checked === this.currentAllSymbols) {
      return;
    }

    this.currentAllSymbols = checked;
    this.allSymbolsControl.setValue(checked, { emitEvent: false });

    if (checked) {
      this.currentSymbol = null;
      this.symbolControl.disable({ emitEvent: false });
      this.symbolControl.setValue('', { emitEvent: false });
    } else {
      this.symbolControl.enable({ emitEvent: false });
    }

    this.facade.setAllSymbols(checked);
  }

  private applyMinQuantity(value: number, publish: boolean): void {
    if (value === this.currentMinQuantity) {
      return;
    }

    this.currentMinQuantity = value;
    this.minQuantityControl.setValue(value, { emitEvent: false });
    this.facade.updateMinQuantity(value);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'minQuantity', value);
    }
  }

  private applySymbol(symbol: unknown, publish: boolean): void {
    const nextSymbol = this.resolveSymbol(symbol);

    if (!nextSymbol || sameTimeSalesSymbol(this.currentSymbol, nextSymbol)) {
      return;
    }

    this.currentSymbol = nextSymbol;
    this.currentAllSymbols = false;
    this.allSymbolsControl.setValue(false, { emitEvent: false });
    this.symbolControl.enable({ emitEvent: false });
    this.symbolControl.setValue(nextSymbol, { emitEvent: false });
    this.facade.selectSymbol(nextSymbol);

    if (publish) {
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'allSymbols', false);
      this.linkedFilters.publish(this.linkedFilterGroup(), this.linkedFilterSourceId, 'symbol', normalizeSharedSymbolOption(nextSymbol));
    }
  }

  private resolveSymbol(value: unknown): SymbolOption | null {
    const sharedSymbol = normalizeSharedSymbolOption(value);

    if (!sharedSymbol) {
      return null;
    }

    return {
      symbolId: sharedSymbol.symbolId,
      symbolName: sharedSymbol.symbolName,
      marketShortName: sharedSymbol.market,
      marketName: `${sharedSymbol.market} Market`,
      currency: sharedSymbol.currency
    };
  }
}

function isTimeSalesMarket(value: unknown): value is 'all' | 'tadawul' | 'dfm' | 'adx' {
  return value === 'all' || value === 'tadawul' || value === 'dfm' || value === 'adx';
}

function sameTimeSalesSymbol(left: SymbolOption | null, right: SymbolOption | null): boolean {
  return !!left && !!right && left.symbolId === right.symbolId && left.marketShortName === right.marketShortName;
}

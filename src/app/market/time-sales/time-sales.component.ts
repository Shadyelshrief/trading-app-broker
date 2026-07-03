import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
import { MarketDropdownComponent } from '../../shared/components';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
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
    MarketDropdownComponent,
    MarketGridComponent
  ],
  templateUrl: './time-sales.component.html',
  styleUrl: './time-sales.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [TimeSalesFacade]
})
export class TimeSalesComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(TimeSalesFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;
  protected readonly allSymbolsControl = new FormControl(true, { nonNullable: true });
  protected readonly marketControl = new FormControl<'all' | 'tadawul' | 'dfm' | 'adx'>('all', {
    nonNullable: true
  });
  protected readonly minQuantityControl = new FormControl(0, { nonNullable: true });
  protected readonly symbolControl = new FormControl<string | SymbolOption>({ value: '', disabled: true }, { nonNullable: true });
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

        this.facade.setAllSymbols(checked);
      });

    this.marketControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((market) => this.facade.selectMarket(market));

    this.minQuantityControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => this.facade.updateMinQuantity(value));

    this.symbolControl.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateSymbolQuery(value);
          return;
        }

        this.facade.selectSymbol(value);
      });
  }

  protected displaySymbol(option: string | SymbolOption | null): string {
    if (!option) {
      return '';
    }

    return typeof option === 'string' ? option : `${option.symbolId} - ${option.symbolName}`;
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
    return this.state();
  }
}

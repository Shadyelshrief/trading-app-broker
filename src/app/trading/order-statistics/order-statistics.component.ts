import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime } from 'rxjs';

import { MarketDropdownComponent } from '../../shared/components';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { ClientOption, SymbolOption } from '../services/order.models';
import { createOrderStatisticsColumns } from './order-statistics.columns';
import { OrderStatisticsFacade } from './order-statistics.facade';

@Component({
  selector: 'app-order-statistics',
  standalone: true,
  imports: [
    AsyncPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MarketDropdownComponent,
    MarketGridComponent,
    ReactiveFormsModule
  ],
  templateUrl: './order-statistics.component.html',
  styleUrl: './order-statistics.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OrderStatisticsFacade]
})
export class OrderStatisticsComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(OrderStatisticsFacade);
  private readonly fb = inject(FormBuilder);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = createOrderStatisticsColumns();
  protected readonly filters = this.fb.nonNullable.group({
    client: ['' as string | ClientOption],
    market: [''],
    symbol: ['' as string | SymbolOption],
    orderType: [''],
    portfolioId: [''],
    fromDate: [''],
    toDate: [''],
    brokerId: [''],
    statusGroup: ['']
  });

  constructor() {
    this.filters.controls.client.valueChanges.pipe(debounceTime(180), takeUntilDestroyed()).subscribe((value) => {
      if (typeof value === 'string') {
        this.facade.updateClientQuery(value);
      }
    });
    this.filters.controls.symbol.valueChanges.pipe(debounceTime(180), takeUntilDestroyed()).subscribe((value) => {
      if (typeof value === 'string') {
        this.facade.updateSymbolQuery(value);
      }
    });
    this.filters.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      this.facade.patchFilters({
        market: value.market,
        orderType: value.orderType,
        portfolioId: value.portfolioId,
        fromDate: value.fromDate,
        toDate: value.toDate,
        brokerId: value.brokerId,
        statusGroup: value.statusGroup
      });
    });
  }

  protected displayClient(value: string | ClientOption | null): string {
    return !value ? '' : typeof value === 'string' ? value : `${value.clientId} - ${value.clientName}`;
  }

  protected displaySymbol(value: string | SymbolOption | null): string {
    return !value ? '' : typeof value === 'string' ? value : `${value.symbolId} - ${value.symbolName}`;
  }

  protected selectClient(client: ClientOption): void {
    this.filters.controls.client.setValue(client, { emitEvent: false });
    this.facade.selectClient(client);
  }

  protected selectSymbol(symbol: SymbolOption): void {
    this.filters.controls.symbol.setValue(symbol, { emitEvent: false });
    this.facade.selectSymbol(symbol);
  }

  protected reset(): void {
    this.filters.reset({ client: '', market: '', symbol: '', orderType: '', portfolioId: '', fromDate: '', toDate: '', brokerId: '', statusGroup: '' });
    this.facade.reset();
  }

  captureState() {
    return this.state();
  }
}

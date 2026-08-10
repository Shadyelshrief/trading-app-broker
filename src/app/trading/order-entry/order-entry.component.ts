import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, HostListener, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, take } from 'rxjs';

import { OrderConfirmationDialogComponent } from '../order-confirmation/order-confirmation-dialog.component';
import { formatClientDisplay } from '../../shared/utils/client-display.util';
import { MarketDepthLevel } from '../../shared/utils/market-depth.mapper';
import type { ClientOption, OrderEntryForm, OrderSide, OrderType, SymbolOption } from '../services/order.models';
import { calculateOrderAmount, mapTakeHitType, resolveDisclosedVolume } from './order-entry.mapper';
import { OrderEntryMarketDepthComponent } from './order-entry-market-depth.component';
import type { OrderConfirmationData, OrderEntryViewModel } from './order-entry.models';
import { OrderEntryFacade } from './order-entry.facade';
import { orderEntryValidator, pricePrecisionValidator } from './order-entry.validators';

@Component({
  selector: 'app-order-entry',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
    OrderEntryMarketDepthComponent
  ],
  templateUrl: './order-entry.component.html',
  styleUrl: './order-entry.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [OrderEntryFacade]
})
export class OrderEntryComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(OrderEntryFacade);
  private readonly fb = inject(FormBuilder);
  private readonly dialog = inject(MatDialog);
  protected readonly vm$ = this.facade.vm$;
  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly sideOptions: readonly { label: string; value: OrderSide }[] = [
    { label: 'Buy', value: 'BUY' },
    { label: 'Sell', value: 'SELL' }
  ];
  protected readonly orderTypeOptions: readonly { label: string; value: OrderType }[] = [
    { label: 'Limit Order', value: 'LIMIT' },
    { label: 'Market Order', value: 'MARKET' },
    { label: 'Take Order', value: 'TAKE' },
    { label: 'Hit Order', value: 'HIT' }
  ];
  protected readonly goodTillOptions: readonly { label: string; value: OrderEntryForm['goodTill'] }[] = [
    { label: 'Day', value: 'DAY' },
    { label: 'GTW', value: 'GTW' },
    { label: 'GTM', value: 'GTM' },
    { label: 'GTD', value: 'GTD' },
    { label: 'FOK', value: 'FOK' },
    { label: 'GTC', value: 'GTC' },
    { label: 'FAK', value: 'FAK' },
    { label: 'At Opening', value: 'AT_OPENING' },
    { label: 'GTT', value: 'GTT' }
  ];
  protected readonly fillTermOptions: readonly { label: string; value: OrderEntryForm['fillTerm'] }[] = [
    { label: 'Market Default', value: 'MARKET_DEFAULT' },
    { label: 'AON', value: 'AON' },
    { label: 'MF', value: 'MF' },
    { label: 'MB', value: 'MB' }
  ];
  protected readonly form = this.fb.nonNullable.group(
    {
      clientId: ['', Validators.required],
      portfolioId: ['', Validators.required],
      cashAccountId: ['', Validators.required],
      symbolId: ['', Validators.required],
      market: ['', Validators.required],
      orderSide: ['BUY' as OrderSide, Validators.required],
      orderType: ['LIMIT' as OrderType, Validators.required],
      quantity: [undefined as number | undefined],
      orderPrice: [undefined as number | undefined, pricePrecisionValidator],
      tradeAmount: [undefined as number | undefined],
      goodTill: ['DAY' as OrderEntryForm['goodTill'], Validators.required],
      expiryDate: [this.today],
      sessionId: ['', Validators.required],
      fillTerm: ['MARKET_DEFAULT' as OrderEntryForm['fillTerm'], Validators.required],
      minQuantity: [undefined as number | undefined],
      disclosedVolume: [undefined as number | undefined]
    },
    { validators: [orderEntryValidator] }
  );
  protected readonly clientSearch = this.fb.nonNullable.control<string | ClientOption>('');
  protected readonly symbolSearch = this.fb.nonNullable.control<string | SymbolOption>('');

  constructor() {
    this.clientSearch.valueChanges.pipe(debounceTime(160), takeUntilDestroyed()).subscribe((value) => {
      if (typeof value === 'string') {
        this.facade.updateClientQuery(value);
      }
    });
    this.facade.clientOptions$.pipe(takeUntilDestroyed()).subscribe((clients) => {
      const value = this.clientSearch.value;

      if (typeof value !== 'string') {
        return;
      }

      const normalized = value.trim().toLowerCase();
      const client = clients.find((item) =>
        [item.clientId, item.friendlyId].some((id) => id?.toLowerCase() === normalized)
      );

      if (client) {
        this.selectClient(client);
      }
    });
    this.symbolSearch.valueChanges.pipe(takeUntilDestroyed()).subscribe((value) => {
      if (typeof value === 'string') {
        this.facade.updateSymbolQuery(value);
      }
    });
    this.facade.symbolOrderOptions$.pipe(takeUntilDestroyed()).subscribe((options) => {
      const sessions = options?.sessions ?? [];
      const current = this.form.controls.sessionId.value;

      if (!sessions.some((session) => session.value === current)) {
        this.form.controls.sessionId.setValue(
          sessions.find((session) => session.isDefault)?.value ?? sessions[0]?.value ?? ''
        );
      }
    });
    this.form.controls.orderType.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncEnabledFields());
    this.form.controls.fillTerm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncEnabledFields());
    this.form.controls.orderSide.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.syncOrderTypeBySide());
    this.syncEnabledFields();
    this.prefillFromState();
  }

  @HostListener('document:keydown.f12', ['$event'])
  protected onConfirmShortcut(event: KeyboardEvent): void {
    event.preventDefault();
    this.vm$.pipe(take(1)).subscribe((vm) => this.confirmPlace(vm));
  }

  protected displayClient(value: string | ClientOption | null): string {
    return formatClientDisplay(value);
  }

  protected displaySymbol(value: string | SymbolOption | null): string {
    return !value ? '' : typeof value === 'string' ? value : `${value.symbolId} - ${value.symbolName}`;
  }

  protected selectClient(client: ClientOption): void {
    this.clientSearch.setValue(client, { emitEvent: false });
    this.form.patchValue({ clientId: client.clientId, portfolioId: '', cashAccountId: '', symbolId: '', market: '', sessionId: '' });
    this.symbolSearch.setValue('', { emitEvent: false });
    this.facade.updateSymbolQuery('');
    this.facade.selectClient(client);
  }

  protected selectSymbol(symbol: SymbolOption): void {
    this.symbolSearch.setValue(symbol, { emitEvent: false });
    this.form.patchValue({ symbolId: symbol.symbolId, sessionId: '' });
    this.facade.selectSymbol(symbol);
  }

  protected selectMarket(market: string): void {
    this.form.patchValue({ symbolId: '', sessionId: '' });
    this.symbolSearch.setValue('', { emitEvent: false });
    this.facade.updateSymbolQuery('');
    this.facade.selectMarket(market);
  }

  protected selectPortfolio(portfolioId: string): void {
    this.form.patchValue({ portfolioId, cashAccountId: '' });
    this.facade.selectPortfolio(portfolioId);
  }

  protected calculate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.calculateTakeHitOrder(this.currentOrder()).subscribe((calculation) => {
      if (calculation) {
        this.form.patchValue({
          quantity: calculation.quantity,
          orderPrice: calculation.orderPrice,
          tradeAmount: calculation.tradeAmount
        });
      }
    });
  }

  protected simulate(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.facade.simulate(this.currentOrder()).subscribe();
  }

  protected confirmPlace(vm: OrderEntryViewModel): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const order = this.currentOrder();
    const data: OrderConfirmationData = {
      title: `${order.orderSide === 'BUY' ? 'Buy' : 'Sell'} Order`,
      actionLabel: order.orderSide === 'BUY' ? 'Buy' : 'Sell',
      order,
      fees: vm.calculation?.fees ?? 0,
      orderAmount: vm.calculation?.orderAmount ?? calculateOrderAmount(order),
      expiresOn: order.expiryDate ?? '',
      portfolioLabel: vm.portfolioOptions.find((portfolio) => portfolio.portfolioId === order.portfolioId)?.portfolioName ?? order.portfolioId,
      sessionLabel: vm.symbolOptionsState?.sessions.find((session) => session.value === order.sessionId)?.label ?? order.sessionId
    };

    this.dialog
      .open(OrderConfirmationDialogComponent, {
        width: 'min(520px, 94vw)',
        data
      })
      .afterClosed()
      .subscribe((result) => {
        if (result?.confirmed) {
          this.facade.place(mapTakeHitType(order)).subscribe((placementResult) => {
            if (placementResult.success) {
              this.resetFormFields();
              this.facade.resetAfterSuccessfulOrder();
            }
          });
        }
      });
  }

  protected clear(): void {
    this.resetFormFields();
    this.facade.selectClient(null);
    this.facade.selectMarket('');
    this.facade.clearResult();
  }

  private resetFormFields(): void {
    this.form.reset({
      clientId: '',
      portfolioId: '',
      cashAccountId: '',
      symbolId: '',
      market: '',
      orderSide: 'BUY',
      orderType: 'LIMIT',
      goodTill: 'DAY',
      expiryDate: this.today,
      sessionId: '',
      fillTerm: 'MARKET_DEFAULT'
    });
    this.clientSearch.setValue('');
    this.symbolSearch.setValue('');
  }

  protected currentOrder(): OrderEntryForm {
    const value = this.form.getRawValue();
    return {
      ...value,
      disclosedVolume: resolveDisclosedVolume(value),
      quantity: value.quantity ?? undefined,
      orderPrice: value.orderPrice ?? undefined,
      tradeAmount: value.tradeAmount ?? undefined,
      minQuantity: value.minQuantity ?? undefined
    };
  }

  protected natMidPercent(vm: OrderEntryViewModel): number {
    const symbol = vm.selectedSymbol;
    const price = Number(this.form.controls.orderPrice.value ?? 0);

    if (!symbol?.natPrice || !symbol.midPrice || symbol.midPrice <= symbol.natPrice || !price) {
      return 50;
    }

    return Math.max(0, Math.min(100, ((price - symbol.natPrice) / (symbol.midPrice - symbol.natPrice)) * 100));
  }

  protected applyDepthLevel(side: OrderSide, level: MarketDepthLevel): void {
    this.form.patchValue({
      orderSide: side,
      orderType: 'LIMIT',
      orderPrice: level.price
    });
    this.syncEnabledFields();
    this.facade.clearResult();
  }

  private syncEnabledFields(): void {
    const orderType = this.form.controls.orderType.value;
    const fillTerm = this.form.controls.fillTerm.value;

    if (orderType === 'MARKET') {
      this.form.controls.orderPrice.disable({ emitEvent: false });
      this.form.controls.tradeAmount.disable({ emitEvent: false });
    } else if (orderType === 'LIMIT') {
      this.form.controls.orderPrice.enable({ emitEvent: false });
      this.form.controls.tradeAmount.disable({ emitEvent: false });
    } else {
      this.form.controls.tradeAmount.enable({ emitEvent: false });
      this.form.controls.orderPrice.disable({ emitEvent: false });
    }

    if (fillTerm === 'MF' || fillTerm === 'MB') {
      this.form.controls.minQuantity.enable({ emitEvent: false });
    } else {
      this.form.controls.minQuantity.disable({ emitEvent: false });
      this.form.controls.minQuantity.setValue(undefined, { emitEvent: false });
    }
  }

  private syncOrderTypeBySide(): void {
    const side = this.form.controls.orderSide.value;
    const type = this.form.controls.orderType.value;

    if (side === 'BUY' && type === 'HIT') {
      this.form.controls.orderType.setValue('TAKE');
    }
    if (side === 'SELL' && type === 'TAKE') {
      this.form.controls.orderType.setValue('HIT');
    }
  }

  private prefillFromState(): void {
    const context = this.state()?.context;
    const order = context?.['order'] as Record<string, unknown> | undefined;
    const side = context?.['side'];

    if (!order) {
      return;
    }

    this.form.patchValue({
      clientId: typeof order['clientId'] === 'string' ? order['clientId'] : '',
      portfolioId: typeof order['portfolioNumber'] === 'string' ? order['portfolioNumber'] : '',
      symbolId: typeof order['symbolId'] === 'string' ? order['symbolId'] : '',
      market: typeof order['market'] === 'string' ? order['market'] : '',
      sessionId: typeof order['sessionId'] === 'string' ? order['sessionId'] : '',
      orderSide: side === 'sell' ? 'SELL' : 'BUY'
    });
  }

  captureState() {
    return this.state();
  }
}

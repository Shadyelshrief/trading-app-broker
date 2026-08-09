import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { combineLatest, map, of, shareReplay, startWith } from 'rxjs';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import { calculateCashPositionSummary } from '../portfolio-positioning/portfolio-positioning.mapper';
import { createCashDetailsColumns } from './cash-details.columns';
import type { CashDetailsDialogData } from './cash-details.models';

@Component({
  selector: 'app-cash-details-dialog',
  standalone: true,
  imports: [
    AsyncPipe,
    DecimalPipe,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MarketGridComponent,
    ReactiveFormsModule
  ],
  templateUrl: './cash-details-dialog.component.html',
  styleUrl: './cash-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CashDetailsDialogComponent {
  protected readonly data = inject<CashDetailsDialogData>(MAT_DIALOG_DATA);
  protected readonly currencyControl = new FormControl('', { nonNullable: true });
  protected readonly columns = createCashDetailsColumns();
  protected readonly settings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'cash-details'
  };
  private readonly wallets = this.data.wallets.map((wallet) => ({
    ...wallet,
    currency: wallet.currency || this.data.portfolioCurrency
  }));
  protected readonly selectedCurrency$ = this.currencyControl.valueChanges.pipe(startWith(this.currencyControl.value));
  protected readonly rows$ = this.selectedCurrency$.pipe(
    map((currency) => this.wallets.filter((wallet) => !currency || wallet.currency === currency)),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  protected readonly summary$ = combineLatest([this.rows$, this.selectedCurrency$]).pipe(
    map(([wallets, currency]) =>
      currency
        ? calculateCashPositionSummary(wallets, currency)
        : {
            ...this.data.summary,
            currency: this.data.summary.currency || this.data.portfolioCurrency
          }
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  protected readonly currencyOptions$ = of(
    Array.from(
      new Set(
        [this.data.portfolioCurrency, ...this.wallets.map((wallet) => wallet.currency)]
          .map((currency) => currency.trim())
          .filter(Boolean)
      )
    )
  );
}

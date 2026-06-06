import { AsyncPipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { catchError, combineLatest, of, shareReplay, startWith, switchMap } from 'rxjs';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import { PortfolioPositioningService } from '../portfolio-positioning/portfolio-positioning.service';
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
  private readonly service = inject(PortfolioPositioningService);
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
  protected readonly selectedCurrency$ = this.currencyControl.valueChanges.pipe(startWith(this.currencyControl.value));
  protected readonly rows$ = this.selectedCurrency$.pipe(
    switchMap((currency) =>
      this.service
        .getCashDetails({
          clientId: this.data.clientId,
          portfolioId: this.data.portfolioId,
          currency: currency || undefined
        })
        .pipe(catchError(() => of([])))
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  protected readonly summary$ = this.selectedCurrency$.pipe(
    switchMap((currency) =>
      currency
        ? this.service
            .getCashPositionByCurrency({
              clientId: this.data.clientId,
              portfolioId: this.data.portfolioId,
              currency
            })
            .pipe(catchError(() => of(null)))
        : of(null)
    ),
    shareReplay({ bufferSize: 1, refCount: true })
  );
  protected readonly currencyOptions$ = combineLatest([this.rows$, this.selectedCurrency$]).pipe(
    switchMap(([rows, selectedCurrency]) =>
      of(
        Array.from(
          new Set(
            [this.data.portfolioCurrency, selectedCurrency, ...rows.map((row) => row.currency)]
              .map((currency) => currency.trim())
              .filter(Boolean)
          )
        )
      )
    )
  );
}

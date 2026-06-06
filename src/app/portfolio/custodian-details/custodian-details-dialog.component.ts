import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { catchError, of, shareReplay } from 'rxjs';

import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import type { MarketGridSettings } from '../../shared/models/market-grid.model';
import { PortfolioPositioningService } from '../portfolio-positioning/portfolio-positioning.service';
import { createCustodianDetailsColumns } from './custodian-details.columns';
import type { CustodianDetailsDialogData } from './custodian-details.models';

@Component({
  selector: 'app-custodian-details-dialog',
  standalone: true,
  imports: [AsyncPipe, MatButtonModule, MatDialogModule, MarketGridComponent],
  templateUrl: './custodian-details-dialog.component.html',
  styleUrl: './custodian-details-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CustodianDetailsDialogComponent {
  protected readonly data = inject<CustodianDetailsDialogData>(MAT_DIALOG_DATA);
  private readonly service = inject(PortfolioPositioningService);
  protected readonly columns = createCustodianDetailsColumns();
  protected readonly settings: MarketGridSettings = {
    autoScroll: false,
    bidColor: '#3ddc97',
    offerColor: '#ff7d7d',
    fontSize: 13,
    fontFamily: 'IBM Plex Sans, sans-serif',
    theme: 'dark',
    presetId: 'custodian-details'
  };
  protected readonly rows$ = this.service
    .getCustodianDetails({
      clientId: this.data.clientId,
      portfolioId: this.data.portfolioId,
      exchange: this.data.exchange,
      symbolId: this.data.symbolId,
      currency: this.data.currency
    })
    .pipe(catchError(() => of([])), shareReplay({ bufferSize: 1, refCount: true }));
}

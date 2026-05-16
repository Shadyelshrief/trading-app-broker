import { AsyncPipe, DecimalPipe, NgClass } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { HeaderMarketStatusFacade } from './header-market-status.facade';

@Component({
  selector: 'app-header-market-status',
  standalone: true,
  imports: [AsyncPipe, DecimalPipe, NgClass, MatFormFieldModule, MatSelectModule],
  templateUrl: './header-market-status.component.html',
  styleUrl: './header-market-status.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [HeaderMarketStatusFacade]
})
export class HeaderMarketStatusComponent {
  protected readonly facade = inject(HeaderMarketStatusFacade);
  protected readonly vm$ = this.facade.vm$;

  protected selectMarket(marketId: string): void {
    this.facade.selectMarket(marketId);
  }

  protected selectIndex(indexId: string): void {
    this.facade.selectIndex(indexId);
  }
}

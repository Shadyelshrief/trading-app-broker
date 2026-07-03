import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { ReferenceDataLookupsService } from '../../lookups/reference-data-lookups.service';

@Component({
  selector: 'app-market-dropdown',
  standalone: true,
  imports: [AsyncPipe, MatFormFieldModule, MatSelectModule],
  templateUrl: './market-dropdown.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketDropdownComponent {
  private readonly lookups = inject(ReferenceDataLookupsService);

  @Input() label = 'Market';
  @Input() value = '';
  @Input() includeAll = false;
  @Input() allValue = 'all';
  @Input() allLabel = 'All Markets';
  @Input() disabled = false;

  @Output() valueChange = new EventEmitter<string>();

  protected readonly markets$ = this.lookups.getMarkets();
}

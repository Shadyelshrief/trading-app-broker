import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Observable, of } from 'rxjs';

import { ReferenceDataLookupsService, SectorLookupOption } from '../../lookups/reference-data-lookups.service';

@Component({
  selector: 'app-sector-dropdown',
  standalone: true,
  imports: [AsyncPipe, MatFormFieldModule, MatSelectModule],
  templateUrl: './sector-dropdown.component.html',
  styles: [
    `
      :host {
        display: block;
        min-width: 180px;
      }

      mat-form-field {
        width: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SectorDropdownComponent {
  private readonly lookups = inject(ReferenceDataLookupsService);
  private sectors$: Observable<SectorLookupOption[]> = of([]);

  @Input() label = 'Sector';
  @Input() value = 'ALL';
  @Input() includeAll = true;
  @Input() allValue = 'ALL';
  @Input() allLabel = 'All sectors';
  @Input() disabled = false;

  @Input() set marketCode(value: string | null | undefined) {
    this.sectors$ = this.lookups.getSectorsByMarket(value ?? '');
  }

  @Output() valueChange = new EventEmitter<string>();

  protected get options$(): Observable<SectorLookupOption[]> {
    return this.sectors$;
  }
}

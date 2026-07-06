import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import {
  LINKED_FILTER_GROUPS,
  LinkedFilterGroupId
} from '../../services/linked-filter-group.service';

@Component({
  selector: 'app-linked-filter-group-control',
  standalone: true,
  imports: [MatFormFieldModule, MatSelectModule],
  templateUrl: './linked-filter-group-control.component.html',
  styleUrl: './linked-filter-group-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LinkedFilterGroupControlComponent {
  @Input() value: LinkedFilterGroupId | null = null;
  @Output() readonly valueChange = new EventEmitter<LinkedFilterGroupId | null>();

  protected readonly groups = LINKED_FILTER_GROUPS;

  protected select(value: LinkedFilterGroupId | null): void {
    this.valueChange.emit(value);
  }
}

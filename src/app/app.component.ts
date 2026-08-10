import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { DropdownTabSelectionService } from './shared/services/dropdown-tab-selection.service';
import { isWorkspacePopoutUrl } from './core/layout/workspace/workspace-popout.util';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet />',
  styles: [
    `
      :host {
        display: block;
        min-height: 100dvh;
      }
    `
  ]
})
export class AppComponent {
  // Instantiating the root service enables consistent Tab selection for every
  // Material dropdown and autocomplete, including dynamically created widgets.
  private readonly dropdownTabSelection = inject(DropdownTabSelectionService);

  constructor() {
    if (typeof window !== 'undefined' && isWorkspacePopoutUrl(window.location.href)) {
      document.body.classList.add('gl-popout-window');
    }
  }
}

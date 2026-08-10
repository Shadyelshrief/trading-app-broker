import { DOCUMENT } from '@angular/common';
import { Injectable, OnDestroy, inject } from '@angular/core';

const MATERIAL_PANEL_SELECTOR = '.mat-mdc-select-panel, .mat-mdc-autocomplete-panel';

@Injectable({ providedIn: 'root' })
export class DropdownTabSelectionService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly keydownListener = (event: Event): void => {
    selectActiveDropdownOptionOnTab(event as KeyboardEvent, this.document);
  };

  constructor() {
    this.document.addEventListener('keydown', this.keydownListener, true);
  }

  ngOnDestroy(): void {
    this.document.removeEventListener('keydown', this.keydownListener, true);
  }
}

export function selectActiveDropdownOptionOnTab(event: KeyboardEvent, documentRef: Document): boolean {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) {
    return false;
  }

  const panels = Array.from(documentRef.querySelectorAll<HTMLElement>(MATERIAL_PANEL_SELECTOR)).reverse();
  const activeOption = panels.reduce<HTMLElement | undefined>((selection, panel) => {
    if (selection || panel.getAttribute('aria-hidden') === 'true') {
      return selection;
    }

    const enabledOptions = Array.from(panel.querySelectorAll<HTMLElement>('.mat-mdc-option'))
      .filter((option) => option.getAttribute('aria-disabled') !== 'true');

    return enabledOptions.find((option) => option.classList.contains('mat-mdc-option-active')) ?? enabledOptions[0];
  }, undefined);

  if (!activeOption) {
    return false;
  }

  // Let the original Tab continue so focus advances normally after the active
  // option is committed. A programmatic click uses Material's public option
  // interaction path and works for both selects and autocompletes.
  activeOption.click();
  return true;
}

import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { TradingIconName } from '../../navigation/app-menu.types';

@Component({
  selector: 'app-trading-icon',
  standalone: true,
  template: `
    <svg
      class="trading-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.65"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @switch (name()) {
        @case ('home') {
          <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1z" />
        }
        @case ('book') {
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        }
        @case ('sliders') {
          <path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 13v-5m0-4V3M9 8h6M5 16h6m4-5h6" />
        }
        @case ('activity') {
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        }
        @case ('list') {
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        }
        @case ('hash') {
          <path d="M4 9h16M4 15h16M10 3 8 21m8-18-2 18" />
        }
        @case ('trending') {
          <path d="m23 6-9.5 9.5-5-5L1 18" />
          <path d="M17 6h6v6" />
        }
        @case ('users') {
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        }
        @case ('pie') {
          <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
          <path d="M22 12A10 10 0 0 0 12 2v10z" />
        }
        @case ('orders') {
          <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
          <path d="M3 6h18M16 10a4 4 0 0 1-8 0" />
        }
        @case ('eye') {
          <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
          <circle cx="12" cy="12" r="3" />
        }
        @case ('chart') {
          <path d="M3 3v18h18" />
          <path d="m7 14 4-4 4 4 6-7" />
        }
        @case ('layers') {
          <path d="m12.83 2.18 8 3.64a1 1 0 0 1 0 1.82l-8 3.64a1 1 0 0 1-.66 0l-8-3.64a1 1 0 0 1 0-1.82l8-3.64a1 1 0 0 1 .66 0Z" />
          <path d="M22 12.65l-9.17 4.16a1 1 0 0 1-.66 0L2 12.65" />
          <path d="M22 17.65l-9.17 4.16a1 1 0 0 1-.66 0L2 17.65" />
        }
        @case ('grid') {
          <path d="M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 0h7v7h-7z" />
        }
        @case ('clock') {
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        }
        @case ('search') {
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        }
        @case ('bell') {
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        }
        @case ('user') {
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        }
        @case ('settings') {
          <circle cx="12" cy="12" r="3" />
          <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        }
        @case ('globe') {
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        }
        @case ('lock') {
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        }
        @case ('layout') {
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          <path d="M9 3v18M3 9h18" />
        }
        @default {
          <circle cx="12" cy="12" r="3" />
        }
      }
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.15rem;
        height: 1.15rem;
        color: inherit;
      }

      .trading-icon {
        width: 100%;
        height: 100%;
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingIconComponent {
  readonly name = input.required<TradingIconName>();
}

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-auth-chrome',
  standalone: true,
  templateUrl: './auth-chrome.component.html',
  styleUrl: './auth-chrome.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AuthChromeComponent {
  protected readonly barHeights = [
    38, 62, 44, 72, 50, 66, 41, 58, 70, 47, 64, 52, 76, 43, 68, 55
  ] as const;

  protected readonly tickerItems = [
    { symbol: 'ES', price: '5,284.50', change: '+0.42%', up: true },
    { symbol: 'NQ', price: '18,412.25', change: '+0.61%', up: true },
    { symbol: 'CL', price: '78.32', change: '-0.18%', up: false },
    { symbol: 'GC', price: '2,428.10', change: '+0.09%', up: true },
    { symbol: 'BTC', price: '64,120', change: '-0.35%', up: false },
    { symbol: 'EUR/USD', price: '1.0842', change: '+0.02%', up: true },
    { symbol: 'VIX', price: '14.6', change: '-1.20%', up: false },
    { symbol: 'ZN', price: '109-16', change: '+0.05%', up: true }
  ] as const;
}

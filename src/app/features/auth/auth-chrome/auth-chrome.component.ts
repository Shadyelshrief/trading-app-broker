import { ChangeDetectionStrategy, Component } from '@angular/core';

import { TradingIconComponent } from '../../../core/layout/trading-icon/trading-icon.component';

@Component({
  selector: 'app-auth-chrome',
  standalone: true,
  imports: [TradingIconComponent],
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

  protected readonly features = [
    {
      icon: 'chart',
      title: 'Realtime market intelligence',
      body: 'Monitor pricing, watch lists, and market depth from one secure workspace.'
    },
    {
      icon: 'layout',
      title: 'Desk-grade workflow',
      body: 'Move from login to orders, portfolios, and charts with enterprise routing and layout control.'
    },
    {
      icon: 'lock',
      title: 'Protected access',
      body: 'Encrypted sign-in with controlled access to broker dashboards and private order activity.'
    }
  ] as const;

  protected readonly dataPoints = [
    { left: 8, top: 26, delay: 0 },
    { left: 18, top: 38, delay: 1.2 },
    { left: 29, top: 21, delay: 0.6 },
    { left: 46, top: 32, delay: 2.1 },
    { left: 63, top: 18, delay: 1.7 },
    { left: 74, top: 28, delay: 0.9 },
    { left: 88, top: 16, delay: 2.5 }
  ] as const;

  protected readonly marketHighlights = [
    { label: 'Latency', value: '< 30 ms' },
    { label: 'Markets', value: '24 connected' },
    { label: 'Sessions', value: 'Live routing' }
  ] as const;
}

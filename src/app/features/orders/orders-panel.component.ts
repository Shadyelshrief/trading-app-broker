import { ChangeDetectionStrategy, Component, input } from '@angular/core';

interface OrderRow {
  client: string;
  side: 'Buy' | 'Sell';
  symbol: string;
  qty: string;
  status: string;
}

interface PanelState {
  title: string;
  description?: string;
}

@Component({
  selector: 'app-orders-panel',
  standalone: true,
  templateUrl: './orders-panel.component.html',
  styleUrl: './orders-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersPanelComponent {
  readonly state = input<PanelState>();

  protected readonly rows: ReadonlyArray<OrderRow> = [
    { client: 'BlueWave Capital', side: 'Buy', symbol: 'AAPL', qty: '5,000', status: 'Working' },
    { client: 'Atlas Securities', side: 'Sell', symbol: 'MSFT', qty: '2,000', status: 'Partially Filled' },
    { client: 'North Ridge', side: 'Buy', symbol: 'NVDA', qty: '1,200', status: 'Pending' },
    { client: 'Sterling Partners', side: 'Sell', symbol: 'META', qty: '3,400', status: 'Working' }
  ];

  captureState(): PanelState | undefined {
    return this.state();
  }
}

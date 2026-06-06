import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { ChartingComponent } from '../charting/charting.component';

@Component({
  selector: 'app-market-charts-page',
  standalone: true,
  imports: [ChartingComponent],
  templateUrl: './market-charts-page.component.html',
  styleUrl: './market-charts-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketChartsPageComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  captureState() {
    return this.state();
  }
}

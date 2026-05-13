import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AgChartOptions } from 'ag-charts-community';
import { AgCharts } from 'ag-charts-angular';

interface PanelState {
  title: string;
  description?: string;
}

@Component({
  selector: 'app-chart-panel',
  standalone: true,
  imports: [AgCharts],
  templateUrl: './chart-panel.component.html',
  styleUrl: './chart-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartPanelComponent {
  readonly state = input<PanelState>();

  protected readonly options: AgChartOptions = {
    background: {
      fill: '#09131d'
    },
    padding: {
      top: 12,
      right: 16,
      bottom: 12,
      left: 12
    },
    legend: {
      enabled: false
    },
    title: {
      text: 'Intraday Trend',
      color: '#edf6ff'
    },
    subtitle: {
      text: 'Sample market data',
      color: '#9ab0c7'
    },
    series: [
      {
        type: 'line',
        xKey: 'time',
        yKey: 'price',
        stroke: '#20c4a0',
        strokeWidth: 2,
        marker: {
          enabled: false
        }
      }
    ],
    axes: [
      {
        type: 'category',
        position: 'bottom',
        label: {
          color: '#6d8095'
        }
      },
      {
        type: 'number',
        position: 'right',
        label: {
          color: '#6d8095'
        }
      }
    ],
    data: [
      { time: '09:30', price: 194.2 },
      { time: '10:00', price: 195.4 },
      { time: '10:30', price: 196.1 },
      { time: '11:00', price: 195.6 },
      { time: '11:30', price: 197.3 },
      { time: '12:00', price: 198.4 },
      { time: '12:30', price: 197.8 },
      { time: '13:00', price: 199.2 },
      { time: '13:30', price: 200.1 },
      { time: '14:00', price: 199.4 }
    ]
  };

  captureState(): PanelState | undefined {
    return this.state();
  }
}

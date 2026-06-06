import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

import type { DrawingTool } from '../charting/charting.models';

const DRAWING_TOOLS: ReadonlyArray<{ label: string; value: DrawingTool }> = [
  { label: 'Trend line', value: 'TREND_LINE' },
  { label: 'Horizontal', value: 'HORIZONTAL_LINE' },
  { label: 'Vertical', value: 'VERTICAL_LINE' },
  { label: 'Rectangle', value: 'RECTANGLE' },
  { label: 'Text', value: 'TEXT' },
  { label: 'Eraser', value: 'ERASER' }
];

@Component({
  selector: 'app-line-studies-toolbar',
  standalone: true,
  imports: [CommonModule, MatButtonModule],
  templateUrl: './line-studies-toolbar.component.html',
  styleUrl: './line-studies-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LineStudiesToolbarComponent {
  readonly enabled = input(false);
  readonly activeTool = input<DrawingTool>('NONE');
  readonly toolSelected = output<DrawingTool>();
  readonly clearDrawings = output<void>();

  protected readonly tools = DRAWING_TOOLS;
}

import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import type { DrawingTool } from '../charting/charting.models';
import type { ChartDrawing, DrawingPoint } from './drawing.models';

@Component({
  selector: 'app-drawing-overlay',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drawing-overlay.component.html',
  styleUrl: './drawing-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DrawingOverlayComponent {
  readonly enabled = input(false);
  readonly activeTool = input<DrawingTool>('NONE');
  readonly drawings = input<readonly ChartDrawing[]>([]);
  readonly drawingsChanged = output<readonly ChartDrawing[]>();

  protected readonly draft = signal<ChartDrawing | null>(null);

  protected start(event: PointerEvent): void {
    if (!this.enabled() || this.activeTool() === 'NONE') {
      return;
    }

    if (this.activeTool() === 'ERASER') {
      this.drawingsChanged.emit([]);
      return;
    }

    const point = this.resolvePoint(event);
    this.draft.set({
      id: `drawing-${Date.now()}`,
      tool: this.activeTool() as ChartDrawing['tool'],
      start: point,
      end: point,
      color: '#60a5fa'
    });
  }

  protected move(event: PointerEvent): void {
    const draft = this.draft();

    if (!draft) {
      return;
    }

    this.draft.set({
      ...draft,
      end: this.resolvePoint(event)
    });
  }

  protected finish(): void {
    const draft = this.draft();

    if (!draft) {
      return;
    }

    this.drawingsChanged.emit([...this.drawings(), draft]);
    this.draft.set(null);
  }

  protected styleForDrawing(drawing: ChartDrawing): Record<string, string> {
    const left = Math.min(drawing.start.x, drawing.end.x);
    const top = Math.min(drawing.start.y, drawing.end.y);
    const width = Math.abs(drawing.end.x - drawing.start.x);
    const height = Math.abs(drawing.end.y - drawing.start.y);

    if (drawing.tool === 'HORIZONTAL_LINE') {
      return { left: '0%', top: `${drawing.start.y}%`, width: '100%', height: '0', borderTopColor: drawing.color };
    }

    if (drawing.tool === 'VERTICAL_LINE') {
      return { left: `${drawing.start.x}%`, top: '0%', width: '0', height: '100%', borderLeftColor: drawing.color };
    }

    if (drawing.tool === 'RECTANGLE') {
      return {
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        height: `${height}%`,
        borderColor: drawing.color
      };
    }

    return {
      left: `${left}%`,
      top: `${top}%`,
      width: `${width}%`,
      transform: `rotate(${Math.atan2(drawing.end.y - drawing.start.y, drawing.end.x - drawing.start.x)}rad)`,
      borderTopColor: drawing.color
    };
  }

  private resolvePoint(event: PointerEvent): DrawingPoint {
    const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    const rect = target?.getBoundingClientRect();

    if (!rect) {
      return { x: 0, y: 0 };
    }

    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100)
    };
  }
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

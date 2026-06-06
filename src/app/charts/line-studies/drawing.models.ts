import type { DrawingTool } from '../charting/charting.models';

export interface DrawingPoint {
  x: number;
  y: number;
}

export interface ChartDrawing {
  id: string;
  tool: Exclude<DrawingTool, 'NONE' | 'ERASER'>;
  start: DrawingPoint;
  end: DrawingPoint;
  text?: string;
  color: string;
}

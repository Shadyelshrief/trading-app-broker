const WORKSPACE_GRID_GAP = 8;
const WORKSPACE_MIN_PANEL_WIDTH_RATIO = 0.25;

// Golden Layout sums the minimum height of both side-by-side children when it
// calculates the travel range of a vertical row splitter. Keeping this fixed
// leaves room for the splitter to move while widget content remains scrollable.
export const GOLDEN_LAYOUT_MIN_ITEM_HEIGHT = 80;

export function calculateWorkspaceMinimumItemSize(width: number): { width: number; height: number } {
  return {
    width: Math.max(160, Math.floor(Math.max(0, width - WORKSPACE_GRID_GAP) * WORKSPACE_MIN_PANEL_WIDTH_RATIO)),
    height: GOLDEN_LAYOUT_MIN_ITEM_HEIGHT
  };
}

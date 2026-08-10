import { calculateWorkspaceMinimumItemSize, GOLDEN_LAYOUT_MIN_ITEM_HEIGHT } from './workspace-sizing.util';

describe('calculateWorkspaceMinimumItemSize', () => {
  it('keeps the responsive quarter-width minimum', () => {
    expect(calculateWorkspaceMinimumItemSize(1600)).toEqual({ width: 398, height: 80 });
  });

  it('leaves vertical splitter travel for a two-by-two workspace', () => {
    const workspaceHeight = 720;
    const goldenLayoutCalculatedMinimum = GOLDEN_LAYOUT_MIN_ITEM_HEIGHT * 2 * 2;

    expect(goldenLayoutCalculatedMinimum).toBeLessThan(workspaceHeight);
  });
});

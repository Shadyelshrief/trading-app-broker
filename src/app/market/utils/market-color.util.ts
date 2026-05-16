export function directionColor(direction: 'UP' | 'DOWN' | 'UNCHANGED'): string {
  switch (direction) {
    case 'UP':
      return 'var(--market-up, #49d17d)';
    case 'DOWN':
      return 'var(--market-down, #ff6b6b)';
    default:
      return 'var(--market-flat, #69a8ff)';
  }
}

export function resolveDirection(change: number): 'UP' | 'DOWN' | 'UNCHANGED' {
  if (change > 0) {
    return 'UP';
  }

  if (change < 0) {
    return 'DOWN';
  }

  return 'UNCHANGED';
}

export function getDirectionClass(direction: 'UP' | 'DOWN' | 'UNCHANGED'): string {
  switch (direction) {
    case 'UP':
      return 'market-cell--up';
    case 'DOWN':
      return 'market-cell--down';
    default:
      return 'market-cell--flat';
  }
}

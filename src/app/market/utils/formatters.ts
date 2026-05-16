export function formatPrice(value: number | null | undefined, digits = 2): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(digits) : '--';
}

export function formatQuantity(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString('en-US') : '--';
}

export function formatPercent(value: number | null | undefined, digits = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function formatCompactNumber(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '--';
  }

  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 2
  }).format(value);
}

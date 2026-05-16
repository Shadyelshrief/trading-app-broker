function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeHex(hex: string): string {
  const trimmed = hex.trim().replace('#', '');

  if (trimmed.length === 3) {
    return `#${trimmed
      .split('')
      .map((part) => `${part}${part}`)
      .join('')}`;
  }

  if (trimmed.length === 6) {
    return `#${trimmed}`;
  }

  return '#334155';
}

function toRgb(hex: string): { red: number; green: number; blue: number } {
  const normalized = normalizeHex(hex);
  const red = parseInt(normalized.slice(1, 3), 16);
  const green = parseInt(normalized.slice(3, 5), 16);
  const blue = parseInt(normalized.slice(5, 7), 16);

  return { red, green, blue };
}

function toHex(value: number): string {
  return clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
}

export function interpolateColor(startColor: string, endColor: string, ratio: number): string {
  const start = toRgb(startColor);
  const end = toRgb(endColor);
  const safeRatio = clamp(ratio, 0, 1);

  return `#${toHex(start.red + (end.red - start.red) * safeRatio)}${toHex(
    start.green + (end.green - start.green) * safeRatio
  )}${toHex(start.blue + (end.blue - start.blue) * safeRatio)}`;
}

export function calculateMarketMapColor(
  value: number,
  min: number,
  max: number,
  startColor: string,
  endColor: string
): string {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max)) {
    return startColor;
  }

  if (max <= min) {
    return interpolateColor(startColor, endColor, 0.5);
  }

  const ratio = clamp((value - min) / (max - min), 0, 1);
  return interpolateColor(startColor, endColor, ratio);
}

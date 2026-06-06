import { NgClass, NgStyle } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';

export type MarketTickerType = 'TRADING' | 'PRICING' | 'ANNOUNCEMENTS';
export type MarketTickerDirection = 'rtl' | 'ltr';
export type MarketTickerMovement = 'UP' | 'DOWN' | 'UNCHANGED';

export interface MarketTickerVisualSettings {
  fontFamily?: string;
  fontSize?: number;
}

export interface MarketTickerItem {
  id: string;
  primary: string;
  secondary?: string;
  market?: string;
  price?: number;
  quantity?: number;
  volume?: number;
  change?: number;
  changePercent?: number;
  direction?: MarketTickerMovement;
  headline?: string;
  description?: string;
  time?: string;
  url?: string;
  raw?: unknown;
}

const MIN_TICKER_DURATION_SECONDS = 12;
const MAX_TICKER_DURATION_SECONDS = 420;
const SECONDS_PER_MARKET_ITEM = 2.8;
const SECONDS_PER_ANNOUNCEMENT_ITEM = 5.5;

@Component({
  selector: 'app-market-ticker',
  standalone: true,
  imports: [NgClass, NgStyle],
  templateUrl: './market-ticker.component.html',
  styleUrl: './market-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketTickerComponent {
  readonly items = input<readonly MarketTickerItem[]>([]);
  readonly tickerType = input<MarketTickerType>('PRICING');
  readonly speed = input(36);
  readonly paused = input(false);
  readonly direction = input<MarketTickerDirection>('rtl');
  readonly loading = input(false);
  readonly settings = input<MarketTickerVisualSettings>({});

  readonly itemDoubleClicked = output<MarketTickerItem>();
  readonly itemClicked = output<MarketTickerItem>();
  readonly pausedChanged = output<boolean>();

  protected readonly hoverPaused = signal(false);
  private readonly valueSignatures = new Map<string, string>();
  private readonly valueVersions = new Map<string, number>();
  protected readonly changeVersionMap = signal<ReadonlyMap<string, number>>(new Map());
  protected readonly animationState = computed(() => (this.paused() || this.hoverPaused() ? 'paused' : 'running'));
  protected readonly tickerItems = computed(() => {
    const items = this.items();
    return items.length > 0 ? items : [];
  });
  protected readonly duplicatedItems = computed(() => [...this.tickerItems(), ...this.tickerItems()]);
  private readonly scrollDurationSeconds = computed(() => {
    const itemCount = Math.max(1, this.tickerItems().length);
    const configuredDuration = Math.max(MIN_TICKER_DURATION_SECONDS, this.speed());
    const secondsPerItem =
      this.tickerType() === 'ANNOUNCEMENTS' ? SECONDS_PER_ANNOUNCEMENT_ITEM : SECONDS_PER_MARKET_ITEM;
    const contentAwareDuration = itemCount * secondsPerItem;

    return Math.min(MAX_TICKER_DURATION_SECONDS, Math.max(configuredDuration, contentAwareDuration));
  });
  protected readonly cssVariables = computed(() => ({
    '--market-ticker-duration': `${this.scrollDurationSeconds()}s`,
    '--market-ticker-direction-start': this.direction() === 'rtl' ? '0%' : '-50%',
    '--market-ticker-direction-end': this.direction() === 'rtl' ? '-50%' : '0%',
    '--market-ticker-animation-state': this.animationState(),
    '--market-ticker-font-size': `${this.settings().fontSize ?? 13}px`,
    '--market-ticker-font-family': this.settings().fontFamily ?? 'IBM Plex Sans, sans-serif'
  }));

  constructor() {
    effect(
      () => {
        const activeIds = new Set<string>();

        for (const item of this.items()) {
          activeIds.add(item.id);

          const signature = valueSignature(item);
          const previousSignature = this.valueSignatures.get(item.id);

          if (previousSignature && previousSignature !== signature) {
            this.valueVersions.set(item.id, (this.valueVersions.get(item.id) ?? 0) + 1);
          }

          this.valueSignatures.set(item.id, signature);
        }

        for (const id of this.valueSignatures.keys()) {
          if (!activeIds.has(id)) {
            this.valueSignatures.delete(id);
            this.valueVersions.delete(id);
          }
        }

        this.changeVersionMap.set(new Map(this.valueVersions));
      },
      { allowSignalWrites: true }
    );
  }

  protected pause(): void {
    this.hoverPaused.set(true);
    this.pausedChanged.emit(true);
  }

  protected resume(): void {
    this.hoverPaused.set(false);
    this.pausedChanged.emit(false);
  }

  protected directionClass(item: MarketTickerItem): string {
    switch (item.direction) {
      case 'UP':
        return 'market-ticker__item--up';
      case 'DOWN':
        return 'market-ticker__item--down';
      default:
        return 'market-ticker__item--unchanged';
    }
  }

  protected directionGlyph(item: MarketTickerItem): string {
    switch (item.direction) {
      case 'UP':
        return '↑';
      case 'DOWN':
        return '↓';
      default:
        return '−';
    }
  }

  protected changeVersion(item: MarketTickerItem): number {
    return this.changeVersionMap().get(item.id) ?? 0;
  }

  protected pulseClass(item: MarketTickerItem): string {
    return this.changeVersion(item) % 2 === 0 ? 'market-ticker__number--pulse-a' : 'market-ticker__number--pulse-b';
  }

  protected formatNumber(value: number | undefined, fractionDigits = 2): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '--';
    }

    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: fractionDigits,
      minimumFractionDigits: fractionDigits
    }).format(value);
  }

  protected formatQuantity(value: number | undefined): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return '--';
    }

    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0
    }).format(value);
  }
}

function valueSignature(item: MarketTickerItem): string {
  return [
    item.price,
    item.quantity,
    item.volume,
    item.change,
    item.changePercent,
    item.time,
    item.headline
  ].join('|');
}

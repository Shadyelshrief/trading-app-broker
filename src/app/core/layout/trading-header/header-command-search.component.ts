import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  Subject,
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  startWith,
  switchMap
} from 'rxjs';

import { ProductDetailsDialogService } from '../../../market/price-quote/product-details-dialog.service';
import { ReferenceDataLookupsService } from '../../../shared/lookups/reference-data-lookups.service';
import { APP_MENU_GROUPS } from '../../navigation/app-menu.config';
import { NavMenuGroup, NavMenuItem, TradingIconName } from '../../navigation/app-menu.types';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';

const MAX_COMMAND_RESULTS = 6;
const MAX_SYMBOL_RESULTS = 8;

interface HeaderSearchResult {
  kind: 'command' | 'symbol';
  label: string;
  sublabel?: string;
  icon: TradingIconName;
  route?: (string | number)[];
  product?: { symbol: string; marketCode: string; symbolName?: string };
}

function flattenMenuCommands(groups: readonly NavMenuGroup[]): HeaderSearchResult[] {
  const results: HeaderSearchResult[] = [];

  const walk = (items: readonly NavMenuItem[]): void => {
    for (const item of items) {
      if (item.routerLink?.length) {
        results.push({
          kind: 'command',
          label: item.label,
          sublabel: 'Screen',
          icon: item.icon,
          route: item.routerLink
        });
      }

      if (item.children?.length) {
        walk(item.children);
      }
    }
  };

  for (const group of groups) {
    walk(group.items);
  }

  return results;
}

@Component({
  selector: 'app-header-command-search',
  standalone: true,
  imports: [FormsModule, TradingIconComponent],
  templateUrl: './header-command-search.component.html',
  styleUrl: './header-command-search.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderCommandSearchComponent {
  protected readonly query = signal('');
  protected readonly open = signal(false);
  protected readonly activeIndex = signal(0);

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly referenceData = inject(ReferenceDataLookupsService);
  private readonly productDetails = inject(ProductDetailsDialogService);
  private readonly commandCatalog = flattenMenuCommands(APP_MENU_GROUPS);
  private readonly query$ = new Subject<string>();

  protected readonly results = toSignal(
    this.query$.pipe(
      debounceTime(200),
      map((value) => value.trim()),
      distinctUntilChanged(),
      switchMap((query) => {
        if (!query) {
          return of<HeaderSearchResult[]>([]);
        }

        const commands = this.matchCommands(query);

        return this.referenceData.searchAssets(query).pipe(
          map((assets) => [...commands, ...this.mapSymbolResults(assets)]),
          startWith(commands),
          catchError(() => of(commands))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ),
    { initialValue: [] as HeaderSearchResult[] }
  );

  protected updateQuery(value: string): void {
    this.query.set(value);
    this.activeIndex.set(0);
    this.open.set(value.trim().length > 0);
    this.query$.next(value);
  }

  protected showResults(): void {
    if (this.query().trim()) {
      this.open.set(true);
    }
  }

  protected moveActive(delta: number): void {
    const results = this.results();

    if (!this.open() || results.length === 0) {
      return;
    }

    this.activeIndex.update((index) => (index + delta + results.length) % results.length);
  }

  protected submit(): void {
    const results = this.results();

    if (results.length > 0) {
      this.activate(results[Math.min(this.activeIndex(), results.length - 1)]);
    }
  }

  protected activate(result: HeaderSearchResult): void {
    this.close(true);

    if (result.kind === 'symbol' && result.product) {
      this.productDetails.open(result.product);
      return;
    }

    if (result.route) {
      void this.router.navigate(result.route);
    }
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node | null)) {
      this.close();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.close();
  }

  private close(clearQuery = false): void {
    this.open.set(false);
    this.activeIndex.set(0);

    if (clearQuery) {
      this.query.set('');
      this.query$.next('');
    }
  }

  private matchCommands(query: string): HeaderSearchResult[] {
    const needle = query.toLowerCase();
    return this.commandCatalog
      .filter((command) => command.label.toLowerCase().includes(needle))
      .slice(0, MAX_COMMAND_RESULTS);
  }

  private mapSymbolResults(
    assets: { symbol: string; marketCode: string; name?: string }[]
  ): HeaderSearchResult[] {
    return assets.slice(0, MAX_SYMBOL_RESULTS).map((asset) => ({
      kind: 'symbol' as const,
      label: asset.symbol,
      sublabel: asset.name ? `${asset.name} · ${asset.marketCode}` : asset.marketCode,
      icon: 'hash' as const,
      product: { symbol: asset.symbol, marketCode: asset.marketCode, symbolName: asset.name }
    }));
  }
}

import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { NavigationEnd, Router } from '@angular/router';
import { Subject, catchError, debounceTime, distinctUntilChanged, filter, map, of, startWith, switchMap } from 'rxjs';

import { APP_MENU_GROUPS } from '../../navigation/app-menu.config';
import { NavMenuGroup, NavMenuItem, TradingIconName } from '../../navigation/app-menu.types';
import { AuthService } from '../../auth/auth.service';
import { HeaderMarketStatusComponent } from './header-market-status.component';
import { ShellLayoutService } from '../shell-layout.service';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';
import { WorkspaceLayoutService } from '../workspace/workspace-layout.service';
import { ReferenceDataLookupsService } from '../../../shared/lookups/reference-data-lookups.service';
import { ProductDetailsDialogService } from '../../../market/price-quote/product-details-dialog.service';

/** A single row in the header command-search dropdown. */
export interface HeaderSearchResult {
  kind: 'command' | 'symbol';
  label: string;
  sublabel?: string;
  icon: TradingIconName;
  /** Router commands to navigate to — set for `command` results. */
  route?: (string | number)[];
  /** Raw symbol payload used to open the Product Details dialog — set for `symbol` results. */
  product?: { symbol: string; marketCode: string; symbolName?: string };
}

const MAX_COMMAND_RESULTS = 6;
const MAX_SYMBOL_RESULTS = 8;

/** Flatten the nav menu into searchable leaf commands (items that route somewhere). */
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
  selector: 'app-trading-header',
  standalone: true,
  imports: [
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    TradingIconComponent,
    HeaderMarketStatusComponent
  ],
  templateUrl: './trading-header.component.html',
  styleUrl: './trading-header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingHeaderComponent {
  private readonly auth = inject(AuthService);
  protected readonly layout = inject(ShellLayoutService);
  protected readonly workspace = inject(WorkspaceLayoutService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly referenceData = inject(ReferenceDataLookupsService);
  private readonly productDetails = inject(ProductDetailsDialogService);

  protected readonly routePath = signal(this.router.url);
  protected readonly profileOpen = signal(false);
  protected readonly commandSearch = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly activeIndex = signal(0);

  private readonly commandCatalog = flattenMenuCommands(APP_MENU_GROUPS);
  private readonly query$ = new Subject<string>();

  /** Live dropdown results: matching screens first, then live symbol matches. */
  protected readonly results = toSignal(
    this.query$.pipe(
      debounceTime(200),
      map((value) => value.trim()),
      distinctUntilChanged(),
      switchMap((query) => {
        if (query.length < 1) {
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

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.routePath.set(this.router.url));
  }

  protected onSearchInput(value: string): void {
    this.commandSearch.set(value);
    this.activeIndex.set(0);
    this.searchOpen.set(value.trim().length > 0);
    this.query$.next(value);
  }

  protected onSearchFocus(): void {
    if (this.commandSearch().trim().length > 0) {
      this.searchOpen.set(true);
    }
  }

  protected moveActive(delta: number): void {
    const list = this.results();

    if (!this.searchOpen() || list.length === 0) {
      return;
    }

    const next = (this.activeIndex() + delta + list.length) % list.length;
    this.activeIndex.set(next);
  }

  protected submitSearch(): void {
    const list = this.results();

    if (list.length === 0) {
      return;
    }

    const index = Math.min(this.activeIndex(), list.length - 1);
    this.activateResult(list[index]);
  }

  protected activateResult(result: HeaderSearchResult): void {
    this.closeSearch();
    this.commandSearch.set('');
    this.query$.next('');
    this.layout.closeMobileNav();

    if (result.kind === 'symbol' && result.product) {
      this.productDetails.open(result.product);
      return;
    }

    if (result.route) {
      void this.router.navigate(result.route);
    }
  }

  protected closeSearch(): void {
    this.searchOpen.set(false);
    this.activeIndex.set(0);
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

  protected toggleProfile(): void {
    this.profileOpen.update((v) => !v);
  }

  protected closeProfile(): void {
    this.profileOpen.set(false);
  }

  protected signOut(): void {
    this.closeProfile();
    this.auth.logout();
  }

  protected toggleTheme(): void {
    this.layout.toggleTheme();
  }

  protected toggleMobileNav(): void {
    this.layout.toggleMobileNav();
  }

  protected selectWorkspace(value: string): void {
    if (value.startsWith('workspace:')) {
      this.workspace.restoreWorkspace(value.replace('workspace:', ''));
    }
  }

  protected saveWorkspace(): void {
    this.workspace.saveCurrentWorkspace();
  }

  protected resetWorkspace(): void {
    this.workspace.resetLayout();
  }

  protected selectedWorkspaceValue(): string | null {
    const workspaceId = this.workspace.selectedWorkspaceId();
    return workspaceId ? `workspace:${workspaceId}` : null;
  }

  protected trackWorkspace(item: { id?: string; name?: string }): string {
    return item.id || item.name || 'workspace';
  }

  protected workspaceOptionValue(item: { id?: string; name?: string }): string | null {
    const key = item.id || item.name;
    return key ? `workspace:${key}` : null;
  }

  protected deleteSelectedWorkspace(event: MouseEvent): void {
    event.stopPropagation();
    this.workspace.deleteWorkspace();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.trading-header__profile')) {
      this.profileOpen.set(false);
    }

    if (!target?.closest('.trading-header__search')) {
      this.closeSearch();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    this.layout.closeMobileNav();
    this.profileOpen.set(false);
    this.closeSearch();
  }
}

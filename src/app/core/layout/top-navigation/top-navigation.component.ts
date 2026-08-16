import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  QueryList,
  ViewChildren,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import { APP_MENU_GROUPS } from '../../navigation/app-menu.config';
import { NavMenuGroup, NavMenuItem } from '../../navigation/app-menu.types';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';
import { WorkspaceLayoutService } from '../workspace/workspace-layout.service';

const RESPONSIVE_PRIMARY_GROUP_COUNT = 3;

@Component({
  selector: 'app-top-navigation',
  standalone: true,
  imports: [TradingIconComponent],
  templateUrl: './top-navigation.component.html',
  styleUrl: './top-navigation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopNavigationComponent implements AfterViewInit {
  @ViewChildren('menuTrigger')
  private readonly menuTriggers!: QueryList<ElementRef<HTMLButtonElement>>;

  @ViewChildren('menuItem')
  private readonly menuItems!: QueryList<ElementRef<HTMLButtonElement>>;

  protected readonly groups: readonly NavMenuGroup[] = APP_MENU_GROUPS;
  protected readonly overflowGroups: readonly NavMenuGroup[] = APP_MENU_GROUPS.slice(
    RESPONSIVE_PRIMARY_GROUP_COUNT
  );
  protected readonly openMenuId = signal<string | null>(null);
  protected readonly activeGroupId = signal<string | null>(null);
  protected readonly activeItemId = signal<string | null>(null);

  private readonly router = inject(Router);
  private readonly workspace = inject(WorkspaceLayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registeredMenuElements = new Set<HTMLElement>();
  private menuPointerOrigin: { x: number; y: number } | null = null;

  constructor() {
    this.updateActiveRoute(this.router.url);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => this.updateActiveRoute(event.urlAfterRedirects));

    this.destroyRef.onDestroy(() => this.unregisterMenuDragSources());
  }

  ngAfterViewInit(): void {
    this.menuItems.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => queueMicrotask(() => this.registerMenuDragSources()));
  }

  protected toggleMenu(menuId: string): void {
    this.openMenuId.update((current) => (current === menuId ? null : menuId));

    if (this.openMenuId()) {
      queueMicrotask(() => this.registerMenuDragSources());
    }
  }

  protected switchOpenMenu(menuId: string): void {
    if (this.openMenuId() && this.openMenuId() !== menuId) {
      this.openMenuId.set(menuId);
    }
  }

  protected isGroupActive(groupId: string): boolean {
    return this.activeGroupId() === groupId;
  }

  protected isMoreActive(): boolean {
    return this.overflowGroups.some((group) => group.id === this.activeGroupId());
  }

  protected isItemActive(itemId: string): boolean {
    return this.activeItemId() === itemId;
  }

  protected groupHasRoutableItems(group: NavMenuGroup): boolean {
    return group.items.some((item) => this.itemHasRoute(item));
  }

  protected beginMenuInteraction(event: PointerEvent): void {
    this.menuPointerOrigin = { x: event.clientX, y: event.clientY };
  }

  protected openMenuItem(
    event: MouseEvent,
    route: string | undefined,
    itemId: string,
    groupId: string
  ): void {
    const origin = this.menuPointerOrigin;
    this.menuPointerOrigin = null;

    if (!route || event.defaultPrevented) {
      return;
    }

    if (
      event.detail !== 0 &&
      origin &&
      Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6
    ) {
      return;
    }

    this.activeGroupId.set(groupId);
    this.activeItemId.set(itemId);
    this.closeMenus();
    this.workspace.openRouteInNewWindow(route);
  }

  protected onTriggerKeydown(event: KeyboardEvent, menuId: string): void {
    const triggers = this.visibleTriggers();
    const currentIndex = triggers.indexOf(event.currentTarget as HTMLButtonElement);

    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        triggers[(currentIndex + 1 + triggers.length) % triggers.length]?.focus();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        triggers[(currentIndex - 1 + triggers.length) % triggers.length]?.focus();
        break;
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        event.preventDefault();
        this.openMenuId.set(menuId);
        queueMicrotask(() => this.visibleItems()[0]?.focus());
        break;
      case 'Home':
        event.preventDefault();
        triggers[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        triggers.at(-1)?.focus();
        break;
      case 'Escape':
        this.closeMenus();
        break;
    }
  }

  protected onItemKeydown(event: KeyboardEvent): void {
    const items = this.visibleItems();
    const current = event.currentTarget as HTMLButtonElement;
    const currentIndex = items.indexOf(current);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[(currentIndex + 1 + items.length) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[(currentIndex - 1 + items.length) % items.length]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items.at(-1)?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        this.focusOpenTrigger();
        this.closeMenus();
        break;
    }
  }

  protected trackByGroupId(_index: number, group: NavMenuGroup): string {
    return group.id;
  }

  protected trackByItemId(_index: number, item: NavMenuItem): string {
    return item.id;
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (!target?.closest('.top-navigation')) {
      this.closeMenus();
    }

  }

  @HostListener('document:keydown.escape')
  protected onDocumentEscape(): void {
    this.closeMenus();
  }

  private itemHasRoute(item: NavMenuItem): boolean {
    return Boolean(item.routerLink?.length || item.children?.some((child) => this.itemHasRoute(child)));
  }

  private visibleTriggers(): HTMLButtonElement[] {
    return this.menuTriggers
      .map((element) => element.nativeElement)
      .filter((element) => element.offsetParent !== null);
  }

  private visibleItems(): HTMLButtonElement[] {
    return this.menuItems
      .map((element) => element.nativeElement)
      .filter((element) => element.offsetParent !== null);
  }

  private focusOpenTrigger(): void {
    const openMenuId = this.openMenuId();

    if (!openMenuId) {
      return;
    }

    this.visibleTriggers().find((trigger) => trigger.dataset['menuId'] === openMenuId)?.focus();
  }

  private closeMenus(): void {
    this.openMenuId.set(null);
    this.unregisterMenuDragSources();
  }

  private registerMenuDragSources(): void {
    this.unregisterMenuDragSources();

    this.menuItems.forEach((source) => {
      const route = source.nativeElement.dataset['route'];

      if (route) {
        this.workspace.registerRouteDragSource(source.nativeElement, route);
        this.registeredMenuElements.add(source.nativeElement);
      }
    });
  }

  private unregisterMenuDragSources(): void {
    for (const element of this.registeredMenuElements) {
      this.workspace.unregisterDragSource(element);
    }

    this.registeredMenuElements.clear();
  }

  private updateActiveRoute(url: string): void {
    const normalizedUrl = this.normalizeRoute(url);

    for (const group of this.groups) {
      const activeItem = this.findActiveItem(group.items, normalizedUrl);

      if (activeItem) {
        this.activeGroupId.set(group.id);
        this.activeItemId.set(activeItem.id);
        return;
      }
    }

    if (normalizedUrl === '/app' || normalizedUrl === '/app/home') {
      this.activeGroupId.set('dashboard');
      this.activeItemId.set('dashboard-home');
    }
  }

  private findActiveItem(items: readonly NavMenuItem[], url: string): NavMenuItem | null {
    for (const item of items) {
      const itemRoute = item.routerLink?.length
        ? this.normalizeRoute(item.routerLink.join(''))
        : null;

      if (
        itemRoute &&
        (url === itemRoute || (itemRoute !== '/app' && url.startsWith(`${itemRoute}/`)))
      ) {
        return item;
      }

      if (item.children?.length) {
        const child = this.findActiveItem(item.children, url);

        if (child) {
          return child;
        }
      }
    }

    return null;
  }

  private normalizeRoute(route: string): string {
    const path = route.split(/[?#]/, 1)[0].replace(/\/+$/, '');
    return path || '/';
  }
}

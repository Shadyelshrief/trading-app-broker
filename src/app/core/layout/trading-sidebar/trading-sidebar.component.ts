import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  QueryList,
  ViewChildren,
  inject,
  signal
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { APP_MENU_GROUPS } from '../../navigation/app-menu.config';
import { NavMenuGroup, NavMenuItem } from '../../navigation/app-menu.types';
import { ShellLayoutService } from '../shell-layout.service';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';
import { WorkspaceLayoutService } from '../workspace/workspace-layout.service';

@Component({
  selector: 'app-trading-sidebar',
  standalone: true,
  imports: [TradingIconComponent],
  templateUrl: './trading-sidebar.component.html',
  styleUrl: './trading-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingSidebarComponent implements AfterViewInit {
  @ViewChildren('workspaceMenuItem')
  private readonly workspaceMenuElements!: QueryList<ElementRef<HTMLElement>>;

  protected readonly layout = inject(ShellLayoutService);
  private readonly workspace = inject(WorkspaceLayoutService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly registeredMenuElements = new Set<HTMLElement>();
  private menuPointerOrigin: { x: number; y: number } | null = null;

  protected readonly groups: readonly NavMenuGroup[] = APP_MENU_GROUPS;

  protected readonly expanded = signal<ReadonlySet<string>>(
    new Set(APP_MENU_GROUPS.map((g) => g.id))
  );
  protected readonly expandedItems = signal<ReadonlySet<string>>(
    new Set(
      APP_MENU_GROUPS.flatMap((group) =>
        group.items.filter((item) => item.children?.length).map((item) => item.id)
      )
    )
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.unregisterMenuDragSources());
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.registerMenuDragSources());
    this.workspaceMenuElements.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.registerMenuDragSources());
  }

  protected toggleGroup(id: string): void {
    this.expanded.update((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  protected isExpanded(id: string): boolean {
    return this.expanded().has(id);
  }

  protected groupAriaExpanded(id: string): boolean {
    return this.isExpanded(id);
  }

  protected toggleItem(id: string): void {
    this.expandedItems.update((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  }

  protected isItemExpanded(id: string): boolean {
    return this.expandedItems().has(id);
  }

  protected itemAriaExpanded(id: string): boolean {
    return this.isItemExpanded(id);
  }

  protected trackByGroupId(_index: number, group: NavMenuGroup): string {
    return group.id;
  }

  protected trackByItemId(_index: number, item: NavMenuItem): string {
    return item.id;
  }

  protected beginMenuInteraction(event: PointerEvent): void {
    this.menuPointerOrigin = { x: event.clientX, y: event.clientY };
  }

  protected openMenuItemInNewWindow(event: MouseEvent, route?: string): void {
    const origin = this.menuPointerOrigin;
    this.menuPointerOrigin = null;

    if (!route || event.defaultPrevented) {
      return;
    }

    if (event.detail !== 0 && origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6) {
      return;
    }

    this.workspace.openRouteInNewWindow(route);
    this.layout.closeMobileNav();
  }

  private registerMenuDragSources(): void {
    this.unregisterMenuDragSources();
    this.workspaceMenuElements.forEach((source) => {
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
}

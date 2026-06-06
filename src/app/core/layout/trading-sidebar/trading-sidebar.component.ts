import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { IsActiveMatchOptions, RouterLink, RouterLinkActive } from '@angular/router';

import { APP_MENU_GROUPS } from '../../navigation/app-menu.config';
import { NavMenuGroup, NavMenuItem } from '../../navigation/app-menu.types';
import { ShellLayoutService } from '../shell-layout.service';
import { TradingIconComponent } from '../trading-icon/trading-icon.component';

@Component({
  selector: 'app-trading-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TradingIconComponent],
  templateUrl: './trading-sidebar.component.html',
  styleUrl: './trading-sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingSidebarComponent {
  protected readonly layout = inject(ShellLayoutService);

  protected readonly groups: readonly NavMenuGroup[] = APP_MENU_GROUPS;

  protected readonly linkMatch: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored'
  };
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

  protected collapseAndNavigate(): void {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 960px)').matches) {
      this.layout.closeMobileNav();
    }
  }

  protected trackByGroupId(_index: number, group: NavMenuGroup): string {
    return group.id;
  }

  protected trackByItemId(_index: number, item: NavMenuItem): string {
    return item.id;
  }
}

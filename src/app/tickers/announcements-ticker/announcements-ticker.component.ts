import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketDropdownComponent } from '../../shared/components';
import { MarketTickerComponent, MarketTickerItem } from '../../shared/components/market-ticker/market-ticker.component';
import { AnnouncementsTickerFacade } from './announcements-ticker.facade';
import { mapAnnouncementTickerItemToMarketTicker } from './announcements-ticker.mapper';
import { AnnouncementTickerItem } from './announcements-ticker.models';

@Component({
  selector: 'app-announcements-ticker',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatFormFieldModule, MatInputModule, MatSelectModule, MarketDropdownComponent, MarketTickerComponent],
  templateUrl: './announcements-ticker.component.html',
  styleUrl: './announcements-ticker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [AnnouncementsTickerFacade]
})
export class AnnouncementsTickerComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(AnnouncementsTickerFacade);
  private readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;

  protected toTickerItems(items: readonly AnnouncementTickerItem[]): MarketTickerItem[] {
    return items.map((item) => mapAnnouncementTickerItemToMarketTicker(item));
  }

  protected openAnnouncement(item: MarketTickerItem): void {
    const announcement = item.raw as AnnouncementTickerItem | undefined;

    if (announcement?.url && typeof window !== 'undefined') {
      window.open(announcement.url, '_blank', 'noopener,noreferrer');
      return;
    }

    this.workspace.openPanel({
      type: 'news-announcements',
      state: {
        title: 'News & Corporate Actions',
        route: '/app/pricing/news-announcements',
        section: 'pricing',
        screen: 'news-announcements',
        context: { announcement }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

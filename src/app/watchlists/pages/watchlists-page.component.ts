import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { CreateWatchListDialogComponent } from '../create-watch-list/create-watch-list-dialog.component';
import { WatchListService } from '../services/watch-list.service';
import { WatchListConfig } from '../saved-watch-list/saved-watch-list.models';

@Component({
  selector: 'app-watchlists-page',
  standalone: true,
  imports: [AsyncPipe, DatePipe, MatButtonModule, MatDialogModule],
  templateUrl: './watchlists-page.component.html',
  styleUrl: './watchlists-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WatchlistsPageComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  private readonly service = inject(WatchListService);
  private readonly dialog = inject(MatDialog);
  private readonly workspace = inject(WorkspaceLayoutService);
  private readonly createDialogOpened = signal(false);

  protected readonly watchLists$ = this.service.getWatchLists();

  constructor() {
    effect(() => {
      const action = this.state()?.context?.['action'];

      if (action === 'create' && !this.createDialogOpened()) {
        this.createDialogOpened.set(true);
        queueMicrotask(() => this.openCreateWatchList());
      }
    });
  }

  protected openCreateWatchList(): void {
    const dialogRef = this.dialog.open(CreateWatchListDialogComponent, {
      width: 'min(980px, 96vw)',
      maxHeight: '92vh',
      data: { mode: 'create' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'saved' && result.configId) {
        this.openWatchListById(result.configId);
      }
    });
  }

  protected editWatchList(config: WatchListConfig): void {
    const dialogRef = this.dialog.open(CreateWatchListDialogComponent, {
      width: 'min(980px, 96vw)',
      maxHeight: '92vh',
      data: { mode: 'edit', config }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result?.action === 'saved' && result.configId) {
        this.openWatchListById(result.configId);
      }
    });
  }

  protected deleteWatchList(config: WatchListConfig): void {
    if (!confirm(`Delete watch list "${config.name}"?`)) {
      return;
    }

    this.service.deleteWatchList(config.id).subscribe();
  }

  protected openWatchList(config: WatchListConfig): void {
    this.openWatchListById(config.id, config.name);
  }

  private openWatchListById(id: string, name = 'Saved Watch List'): void {
    this.workspace.openPanel({
      type: 'saved-watch-list',
      state: {
        title: name,
        route: `/app/pricing/watch-lists/${id}`,
        section: 'pricing',
        screen: 'saved-watch-list',
        context: { watchListId: id }
      }
    });
  }

  captureState() {
    return this.state();
  }
}

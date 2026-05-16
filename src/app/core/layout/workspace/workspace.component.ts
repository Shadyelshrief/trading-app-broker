import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, startWith } from 'rxjs';

import { WorkspaceLayoutService } from './workspace-layout.service';

@Component({
  selector: 'app-workspace',
  standalone: true,
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceComponent implements AfterViewInit, OnDestroy {
  @ViewChild('layoutHost', { static: true })
  private readonly layoutHost!: ElementRef<HTMLElement>;

  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly workspace = inject(WorkspaceLayoutService);

  ngAfterViewInit(): void {
    this.workspace.init(this.layoutHost.nativeElement);

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        startWith({ urlAfterRedirects: this.router.url } as NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event) => {
        this.workspace.openRoute(event.urlAfterRedirects);
      });
  }

  ngOnDestroy(): void {
    this.workspace.destroy();
  }

  protected resetLayout(): void {
    this.workspace.resetLayout();
  }
}

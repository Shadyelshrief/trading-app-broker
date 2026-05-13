import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input
} from '@angular/core';

import { LayoutService } from './layout.service';

@Component({
  selector: 'app-workspace',
  standalone: true,
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class WorkspaceComponent implements AfterViewInit, OnDestroy {
  readonly subWindow = input(false);

  @ViewChild('layoutHost', { static: true })
  private readonly layoutHost!: ElementRef<HTMLElement>;

  protected readonly layoutService = inject(LayoutService);

  ngAfterViewInit(): void {
    this.layoutService.init(this.layoutHost.nativeElement);
  }

  ngOnDestroy(): void {
    this.layoutService.destroy();
  }

  protected resetLayout(): void {
    this.layoutService.resetLayout();
  }
}

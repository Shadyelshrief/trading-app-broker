import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-empty-shell-page',
  standalone: true,
  templateUrl: './empty-shell-page.component.html',
  styleUrl: './empty-shell-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyShellPageComponent {}

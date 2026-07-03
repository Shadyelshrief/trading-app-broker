import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-system-offline-page',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  templateUrl: './system-offline-page.component.html',
  styleUrl: './system-offline-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SystemOfflinePageComponent {}

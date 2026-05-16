import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { AsyncPipe, TitleCasePipe } from '@angular/common';

@Component({
  selector: 'app-module-placeholder-page',
  standalone: true,
  imports: [AsyncPipe, TitleCasePipe],
  templateUrl: './module-placeholder-page.component.html',
  styleUrl: './module-placeholder-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ModulePlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly vm$ = this.route.paramMap.pipe(
    map((params) => ({
      section: params.get('section') ?? 'module',
      screen: (params.get('screen') ?? 'screen').replace(/-/g, ' ')
    }))
  );
}

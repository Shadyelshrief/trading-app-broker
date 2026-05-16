import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-placeholder-widget',
  standalone: true,
  template: `
    <section class="placeholder-widget">
      <div class="placeholder-widget__card">
        <p class="placeholder-widget__eyebrow">{{ state()?.section ?? 'module' }}</p>
        <h2>{{ state()?.title ?? 'Workspace' }}</h2>
        <p>
          This widget route is registered inside Golden Layout and ready for its dedicated enterprise screen
          implementation.
        </p>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }

      .placeholder-widget {
        min-height: 0;
        height: 100%;
        overflow: auto;
        padding: 1rem;
      }

      .placeholder-widget__card {
        max-width: 48rem;
        padding: 1.5rem;
        border: 1px solid var(--border-subtle);
        border-radius: 1rem;
        background: rgba(8, 18, 29, 0.76);
      }

      .placeholder-widget__eyebrow {
        margin: 0 0 0.35rem;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.72rem;
        color: var(--text-muted);
      }

      h2,
      p {
        margin: 0;
      }

      p:last-child {
        margin-top: 0.75rem;
        color: var(--text-secondary);
      }
    `
  ],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlaceholderWidgetComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string }>();

  captureState() {
    return this.state();
  }
}

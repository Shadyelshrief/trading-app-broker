import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthChromeComponent } from '../auth-chrome/auth-chrome.component';
import { emailFieldValidators, passwordFieldValidators } from '../../../shared/validation/auth-validators';
import { readHttpErrorMessage } from '../../../shared/utils/http-error.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthChromeComponent],
  templateUrl: './login-page.component.html',
  styleUrl: './login-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly feedback = signal<{ type: 'error' | 'success'; text: string } | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', emailFieldValidators],
    password: ['', passwordFieldValidators]
  });

  protected submit(): void {
    this.feedback.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();

    this.loading.set(true);

    this.auth
      .login({ email, password })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
          const safe = returnUrl.startsWith('/') && !returnUrl.startsWith('//');

          void this.router.navigateByUrl(safe ? returnUrl : '/');
        },
        error: (error: unknown) => {
          this.feedback.set({
            type: 'error',
            text: readHttpErrorMessage(error, 'We could not sign you in. Please try again.')
          });
          this.form.patchValue({ password: '' });
        }
      });
  }
}

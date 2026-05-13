import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, distinctUntilChanged, finalize, map, switchMap, tap } from 'rxjs';

import { AuthApiService } from '../../../core/auth/auth-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AuthChromeComponent } from '../auth-chrome/auth-chrome.component';
import { readHttpErrorMessage } from '../../../shared/utils/http-error.util';
import { passwordFieldValidators, passwordsMatchValidator } from '../../../shared/validation/auth-validators';

type TokenStatus = 'idle' | 'missing' | 'checking' | 'valid' | 'invalid';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, AuthChromeComponent],
  templateUrl: './reset-password-page.component.html',
  styleUrl: './reset-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authApi = inject(AuthApiService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tokenStatus = signal<TokenStatus>('idle');
  protected readonly loading = signal(false);
  protected readonly feedback = signal<{ type: 'error' | 'success'; text: string } | null>(null);

  protected readonly form = this.fb.nonNullable.group(
    {
      password: ['', passwordFieldValidators],
      confirm: ['', Validators.required]
    },
    { validators: passwordsMatchValidator }
  );

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => params.get('token')),
        distinctUntilChanged(),
        tap(() => this.feedback.set(null)),
        switchMap((token) => {
          if (!token) {
            this.tokenStatus.set('missing');
            return EMPTY;
          }

          this.tokenStatus.set('checking');

          return this.authApi.validateResetToken(token).pipe(
            tap({
              next: () => this.tokenStatus.set('valid'),
              error: () => this.tokenStatus.set('invalid')
            }),
            catchError(() => EMPTY)
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  protected submit(): void {
    this.feedback.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.tokenStatus.set('missing');
      return;
    }

    const { password } = this.form.getRawValue();

    this.loading.set(true);

    this.auth
      .resetPassword({ token, password })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          this.feedback.set({
            type: 'success',
            text: response.message
          });

          window.setTimeout(() => {
            void this.router.navigateByUrl('/login');
          }, 1200);
        },
        error: (error: unknown) => {
          this.feedback.set({
            type: 'error',
            text: readHttpErrorMessage(error, 'We could not update your password. Request a new reset link.')
          });
        }
      });
  }
}

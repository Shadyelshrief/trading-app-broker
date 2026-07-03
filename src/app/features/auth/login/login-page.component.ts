import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthFlowError } from '../../../core/auth/auth.models';
import { TradingIconComponent } from '../../../core/layout/trading-icon/trading-icon.component';
import { AuthChromeComponent } from '../auth-chrome/auth-chrome.component';
import { loginPasswordFieldValidators, usernameFieldValidators } from '../../../shared/validation/auth-validators';
import { readHttpErrorMessage } from '../../../shared/utils/http-error.util';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    TradingIconComponent,
    AuthChromeComponent
  ],
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
  private readonly snackBar = inject(MatSnackBar);

  protected readonly loading = signal(false);
  protected readonly feedback = signal<{ type: 'error' | 'success'; text: string } | null>(null);
  protected readonly showPassword = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    username: ['', usernameFieldValidators],
    password: ['', loginPasswordFieldValidators]
  });

  constructor() {
    this.auth.prepareLoginEncryption();
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected submit(): void {
    this.feedback.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();

    this.loading.set(true);

    this.auth
      .login({ username, password })
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (response) => {
          if (response.warningMessage) {
            this.snackBar.open(response.warningMessage, 'Dismiss', { duration: 5000 });
          }

          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/app';
          const safe = returnUrl.startsWith('/app') && !returnUrl.startsWith('//');

          void this.router.navigateByUrl(safe ? returnUrl : '/app');
        },
        error: (error: unknown) => {
          if (error instanceof AuthFlowError && error.kind === 'popup') {
            window.alert(error.message);
          } else if (error instanceof AuthFlowError && error.kind === 'fatal') {
            this.feedback.set(null);
          } else {
            this.feedback.set({
              type: 'error',
              text: readHttpErrorMessage(error, 'We could not sign you in. Please try again.')
            });
          }

          this.form.patchValue({ password: '' });
        }
      });
  }
}

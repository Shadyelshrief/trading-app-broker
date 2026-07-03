import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../../core/auth/auth.service';
import { AuthChromeComponent } from '../auth-chrome/auth-chrome.component';
import { readHttpErrorMessage } from '../../../shared/utils/http-error.util';
import { emailFieldValidators } from '../../../shared/validation/auth-validators';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    AuthChromeComponent
  ],
  templateUrl: './forgot-password-page.component.html',
  styleUrl: './forgot-password-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ForgotPasswordPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly loading = signal(false);
  protected readonly feedback = signal<{ type: 'error' | 'success'; text: string } | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', emailFieldValidators]
  });

  protected submit(): void {
    this.feedback.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();

    this.loading.set(true);

    this.auth
      .forgotPassword({ email })
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
        },
        error: (error: unknown) => {
          this.feedback.set({
            type: 'error',
            text: readHttpErrorMessage(error, 'We could not process that request. Please try again.')
          });
        }
      });
  }
}

import { AbstractControl, ValidationErrors, Validators } from '@angular/forms';

export const emailFieldValidators = [Validators.required, Validators.email];

export const usernameFieldValidators = [Validators.required];

export const loginPasswordFieldValidators = [Validators.required];

export const passwordFieldValidators = [
  Validators.required,
  Validators.minLength(8),
  Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/)
];

export function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value as string | undefined;
  const confirm = group.get('confirm')?.value as string | undefined;

  if (!password || !confirm) {
    return null;
  }

  return password === confirm ? null : { passwordMismatch: true };
}

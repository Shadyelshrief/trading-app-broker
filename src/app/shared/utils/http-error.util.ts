import { HttpErrorResponse } from '@angular/common/http';

export function readHttpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  if (error instanceof HttpErrorResponse) {
    const payload = error.error;

    if (payload && typeof payload === 'object' && 'message' in payload) {
      const message = (payload as { message?: unknown }).message;

      if (typeof message === 'string' && message.trim().length > 0) {
        return message;
      }
    }
  }

  return fallback;
}

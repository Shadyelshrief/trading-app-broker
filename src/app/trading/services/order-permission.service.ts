import { Injectable } from '@angular/core';

const LOCKED_STATUSES = new Set(['CANCELLED', 'EXPIRED', 'REJECTED', 'ACCEPTED', 'SETTLED', 'FULLY EXECUTED']);
const ACTIVATE_STATUSES = new Set(['SUSPENDED BY MARKET', 'PARTIALLY EXECUTED - SUSPENDED']);
const SUSPEND_STATUSES = new Set(['PARTIALLY EXECUTED', 'PLACED']);

@Injectable({ providedIn: 'root' })
export class OrderPermissionService {
  canModify(status: string): boolean {
    return !LOCKED_STATUSES.has(normalize(status));
  }

  canCancel(status: string): boolean {
    return !LOCKED_STATUSES.has(normalize(status));
  }

  canActivate(status: string): boolean {
    return ACTIVATE_STATUSES.has(normalize(status));
  }

  canSuspend(status: string): boolean {
    return SUSPEND_STATUSES.has(normalize(status));
  }
}

function normalize(status: string): string {
  return status.trim().toUpperCase().replace(/\s+/g, ' ');
}

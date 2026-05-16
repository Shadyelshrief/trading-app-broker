import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RealtimeFlashService {
  buildFlashClass(direction: 'UP' | 'DOWN' | 'UNCHANGED'): string {
    switch (direction) {
      case 'UP':
        return 'market-flash market-flash--up';
      case 'DOWN':
        return 'market-flash market-flash--down';
      default:
        return 'market-flash market-flash--flat';
    }
  }
}

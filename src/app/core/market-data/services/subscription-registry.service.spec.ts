import { TestBed } from '@angular/core/testing';

import { SubscriptionRegistryService } from './subscription-registry.service';

describe('SubscriptionRegistryService', () => {
  let service: SubscriptionRegistryService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SubscriptionRegistryService);
  });

  it('tracks observer and manual subscriber counts independently', () => {
    expect(service.acquireObserver('market:adx:ihc:tick')).toBe(1);
    expect(service.acquireManual('market:adx:ihc:tick')).toBe(2);
    expect(service.releaseObserver('market:adx:ihc:tick')).toBe(1);
    expect(service.releaseManual('market:adx:ihc:tick')).toBe(0);
  });

  it('stores the latest snapshot for a topic', () => {
    service.publish('market:adx:ihc:tick', { price: 123.45 }, 123);

    expect(service.getSnapshot<{ price: number }>('market:adx:ihc:tick')).toEqual({
      price: 123.45
    });
  });
});

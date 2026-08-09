import { TestBed } from '@angular/core/testing';
import { BehaviorSubject, Observable, Subject } from 'rxjs';

import { MarketDataService, WebSocketState } from '../../core/market-data';
import {
  OrderEntryDepthViewModel,
  OrderEntryMarketDepthFacade
} from './order-entry-market-depth.facade';

describe('OrderEntryMarketDepthFacade', () => {
  let facade: OrderEntryMarketDepthFacade;
  let observeSpy: jasmine.Spy;
  let topics: Map<string, Subject<unknown>>;
  let connectionState: BehaviorSubject<WebSocketState>;

  beforeEach(() => {
    topics = new Map<string, Subject<unknown>>();
    connectionState = new BehaviorSubject<WebSocketState>({
      status: 'authenticated',
      reconnectAttempt: 0,
      connectedAt: Date.now(),
      authenticatedAt: Date.now(),
      lastMessageAt: null,
      lastError: null
    });
    observeSpy = jasmine.createSpy('observe').and.callFake((topic: string): Observable<unknown> => {
      const stream = new Subject<unknown>();
      topics.set(topic, stream);
      return stream.asObservable();
    });

    TestBed.configureTestingModule({
      providers: [
        OrderEntryMarketDepthFacade,
        {
          provide: MarketDataService,
          useValue: {
            observe: observeSpy,
            getConnectionState: () => connectionState.asObservable()
          }
        }
      ]
    });

    facade = TestBed.inject(OrderEntryMarketDepthFacade);
  });

  it('does not subscribe to depth topics until a symbol is selected', () => {
    let latest: OrderEntryDepthViewModel | undefined;
    const subscription = facade.vm$.subscribe((value) => (latest = value));

    expect(observeSpy).not.toHaveBeenCalled();
    expect(latest?.symbol).toBeNull();
    expect(latest?.connectionState).toBe('CONNECTED');

    subscription.unsubscribe();
  });

  it('subscribes to MBP and regular MBO and maps live depth updates', () => {
    let latest: OrderEntryDepthViewModel | undefined;
    const subscription = facade.vm$.subscribe((value) => (latest = value));

    facade.selectSymbol({
      symbolId: 'ihc',
      symbolName: 'International Holding Company',
      market: 'adx',
      currency: 'aed'
    });

    expect(observeSpy).toHaveBeenCalledWith('market:adx:ihc:mbp');
    expect(observeSpy).toHaveBeenCalledWith('market:adx:ihc:mbo');
    expect(latest?.symbol?.symbolId).toBe('IHC');
    expect(latest?.mbp.loading).toBeTrue();

    topics.get('market:adx:ihc:mbp')?.next({
      bids: [{ price: 10.4, quantity: 120 }],
      offers: [{ price: 10.5, quantity: 80 }]
    });
    topics.get('market:adx:ihc:mbo')?.next({
      bids: [{ price: 10.4, quantity: 25 }],
      offers: [{ price: 10.5, quantity: 30 }]
    });

    expect(latest?.mbp.bids[0]?.price).toBe(10.4);
    expect(latest?.mbp.offers[0]?.size).toBe(80);
    expect(latest?.mbo.bids[0]?.size).toBe(25);
    expect(latest?.mbo.loading).toBeFalse();

    subscription.unsubscribe();
  });

  it('switches only the MBO subscription when Special orders are selected', () => {
    const subscription = facade.vm$.subscribe();
    facade.selectSymbol({
      symbolId: 'IHC',
      symbolName: 'International Holding Company',
      market: 'ADX',
      currency: 'AED'
    });

    facade.selectMboOrderType('SPECIAL');

    expect(observeSpy).toHaveBeenCalledWith('market:adx:ihc:mbo:special');
    expect(observeSpy.calls.allArgs().filter(([topic]) => topic === 'market:adx:ihc:mbp').length).toBe(1);

    subscription.unsubscribe();
  });
});

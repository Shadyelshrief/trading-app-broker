import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, debounceTime, finalize, forkJoin, of } from 'rxjs';

import { ClientService } from '../services/client.service';
import type { ClientSearchResult } from '../client-search/client-search.models';
import type {
  ClientInformationViewModel,
  ClientPortfolio,
  DeliveryChannel
} from './client-information.models';

const initialViewModel: ClientInformationViewModel = {
  clientOptions: [],
  selectedClient: null,
  portfolios: [],
  deliveryChannels: [],
  deliveryDetails: null,
  selectedDeliveryChannelId: '',
  selectedLoginId: '',
  loading: false
};

@Injectable()
export class ClientInformationFacade {
  private readonly service = inject(ClientService);
  private readonly stateSubject = new BehaviorSubject<ClientInformationViewModel>(initialViewModel);

  readonly vm$ = this.stateSubject.asObservable();

  updateClientQuery(query: string): void {
    const trimmed = query.trim();

    if (!trimmed) {
      this.patch({ clientOptions: [] });
      return;
    }

    of(trimmed)
      .pipe(
        debounceTime(120),
        catchError(() => of(''))
      )
      .subscribe((value) => {
        if (!value) {
          return;
        }

        this.service
          .searchClientOptions(value)
          .pipe(catchError(() => of([])))
          .subscribe((clientOptions) => this.patch({ clientOptions }));
      });
  }

  selectClient(client: ClientSearchResult): void {
    this.patch({ clientOptions: [client] });
    this.loadClient(client.clientId);
  }

  loadClient(clientId: string): void {
    const trimmed = clientId.trim();

    if (!trimmed) {
      return;
    }

    this.patch({
      loading: true,
      error: undefined,
      selectedClient: null,
      portfolios: [],
      deliveryChannels: [],
      deliveryDetails: null,
      selectedDeliveryChannelId: '',
      selectedLoginId: ''
    });

    forkJoin({
      information: this.service.getClientInformation(trimmed),
      portfolios: this.service.getClientPortfolios(trimmed).pipe(catchError(() => of<ClientPortfolio[]>([]))),
      deliveryChannels: this.service.getDeliveryChannels(trimmed).pipe(catchError(() => of<DeliveryChannel[]>([])))
    })
      .pipe(
        catchError((error: unknown) => {
          this.patch({
            error: resolveErrorMessage(error, 'Unable to load client information.'),
            selectedClient: null,
            portfolios: [],
            deliveryChannels: [],
            deliveryDetails: null
          });

          return of(null);
        }),
        finalize(() => this.patch({ loading: false }))
      )
      .subscribe((result) => {
        if (!result) {
          return;
        }

        const portfolios = result.portfolios.length ? result.portfolios : result.information.portfolios;
        const deliveryChannels = result.deliveryChannels.length
          ? result.deliveryChannels
          : result.information.deliveryChannels;
        const firstChannel = deliveryChannels[0];
        const firstLoginId = firstChannel?.loginIds[0] ?? '';

        this.patch({
          selectedClient: {
            ...result.information,
            portfolios,
            deliveryChannels
          },
          portfolios,
          deliveryChannels,
          selectedDeliveryChannelId: firstChannel?.deliveryChannelId ?? '',
          selectedLoginId: firstLoginId
        });

        if (firstChannel && firstLoginId) {
          this.loadDeliveryDetails(firstChannel.deliveryChannelId, firstLoginId);
        }
      });
  }

  selectDeliveryChannel(deliveryChannelId: string): void {
    const channel = this.stateSubject.value.deliveryChannels.find(
      (item) => item.deliveryChannelId === deliveryChannelId
    );
    const loginId = channel?.loginIds[0] ?? '';

    this.patch({
      selectedDeliveryChannelId: deliveryChannelId,
      selectedLoginId: loginId,
      deliveryDetails: null
    });

    if (deliveryChannelId && loginId) {
      this.loadDeliveryDetails(deliveryChannelId, loginId);
    }
  }

  selectLoginId(loginId: string): void {
    this.patch({
      selectedLoginId: loginId,
      deliveryDetails: null
    });

    const deliveryChannelId = this.stateSubject.value.selectedDeliveryChannelId;

    if (deliveryChannelId && loginId) {
      this.loadDeliveryDetails(deliveryChannelId, loginId);
    }
  }

  private loadDeliveryDetails(deliveryChannelId: string, loginId: string): void {
    const clientId = this.stateSubject.value.selectedClient?.clientId;

    if (!clientId) {
      return;
    }

    this.service
      .getDeliveryChannelDetails(clientId, deliveryChannelId, loginId)
      .pipe(
        catchError((error: unknown) => {
          this.patch({
            deliveryDetails: null,
            error: resolveErrorMessage(error, 'Unable to load delivery channel details.')
          });

          return of(null);
        })
      )
      .subscribe((deliveryDetails) => {
        if (deliveryDetails) {
          this.patch({ deliveryDetails, error: undefined });
        }
      });
  }

  private patch(partial: Partial<ClientInformationViewModel>): void {
    this.stateSubject.next({
      ...this.stateSubject.value,
      ...partial
    });
  }
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }

  return fallback;
}

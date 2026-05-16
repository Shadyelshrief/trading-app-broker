import { FeederInboundMessage } from '../interfaces/feeder-message.interface';

export interface MarketMessage<TPayload = unknown> {
  topic: string;
  payload: TPayload;
  receivedAt: number;
  sequence?: number;
  snapshot: boolean;
  raw: FeederInboundMessage<TPayload>;
}

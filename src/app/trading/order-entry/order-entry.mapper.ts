import type { OrderEntryForm } from '../services/order.models';

export function calculateOrderAmount(order: OrderEntryForm): number {
  const quantity = order.quantity ?? 0;
  const price = order.orderPrice ?? 0;
  return order.tradeAmount ?? quantity * price;
}

export function resolveDisclosedVolume(order: OrderEntryForm): number | undefined {
  return order.disclosedVolume === undefined || order.disclosedVolume === null ? order.quantity : order.disclosedVolume;
}

export function mapTakeHitType(order: OrderEntryForm): OrderEntryForm {
  return order.orderType === 'TAKE' || order.orderType === 'HIT'
    ? {
        ...order,
        orderType: 'MARKET'
      }
    : order;
}

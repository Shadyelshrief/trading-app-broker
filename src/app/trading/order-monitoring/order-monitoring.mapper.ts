import type { OrderMonitoringFilters } from './order-monitoring.models';

export function cleanOrderMonitoringFilters(filters: OrderMonitoringFilters): OrderMonitoringFilters {
  return Object.entries(filters).reduce<OrderMonitoringFilters>((accumulator, [key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim()) {
      accumulator[key as keyof OrderMonitoringFilters] = value as never;
    }
    return accumulator;
  }, {});
}

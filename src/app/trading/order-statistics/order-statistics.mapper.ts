import type { OrderStatisticsFilters } from './order-statistics.models';

export function cleanOrderStatisticsFilters(filters: OrderStatisticsFilters): OrderStatisticsFilters {
  return Object.entries(filters).reduce<OrderStatisticsFilters>((accumulator, [key, value]) => {
    if (value !== undefined && value !== null && `${value}`.trim()) {
      accumulator[key as keyof OrderStatisticsFilters] = value as never;
    }
    return accumulator;
  }, {});
}

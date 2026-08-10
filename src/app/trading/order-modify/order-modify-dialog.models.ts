import { OrderMonitoringRow } from '../services/order.models';

export interface OrderModifyDialogData {
  row: OrderMonitoringRow;
}

export interface OrderModifyDialogResult {
  quantity: number;
  orderPrice?: number;
}

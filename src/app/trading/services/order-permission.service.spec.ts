import { OrderPermissionService } from './order-permission.service';

describe('OrderPermissionService', () => {
  const service = new OrderPermissionService();

  it('allows modification and cancellation for active orders', () => {
    for (const status of ['NEW', 'PENDING', 'ACCEPTED', 'PLACED', 'PARTIALLY_FILLED']) {
      expect(service.canModify(status)).withContext(status).toBeTrue();
      expect(service.canCancel(status)).withContext(status).toBeTrue();
    }
  });

  it('locks completed and terminal orders', () => {
    for (const status of ['FILLED', 'EXECUTED', 'FULLY EXECUTED', 'CANCELLED', 'REJECTED', 'EXPIRED']) {
      expect(service.canModify(status)).withContext(status).toBeFalse();
      expect(service.canCancel(status)).withContext(status).toBeFalse();
    }
  });
});

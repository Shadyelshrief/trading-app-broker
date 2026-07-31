import { TestBed } from '@angular/core/testing';
import { firstValueFrom, take } from 'rxjs';

import { LinkedFilterGroupService } from './linked-filter-group.service';

describe('LinkedFilterGroupService', () => {
  it('syncs matching fields in the same group and ignores the source widget', async () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(LinkedFilterGroupService);
    const sourceGroup = service.createGroupSubject('group-1');
    const targetGroup = service.createGroupSubject('group-1');
    const sourceId = service.createSourceId('source');
    const targetId = service.createSourceId('target');

    const received = firstValueFrom(service.observe<string>(targetGroup, targetId, 'market').pipe(take(1)));

    service.publish(sourceGroup.value, sourceId, 'sector', 'Banks');
    service.publish(sourceGroup.value, targetId, 'market', 'DFM');
    service.publish(sourceGroup.value, sourceId, 'market', 'DFM');

    await expectAsync(received).toBeResolvedTo('DFM');
  });

  it('returns existing group state when a widget joins without overwriting it', () => {
    TestBed.configureTestingModule({});
    const service = TestBed.inject(LinkedFilterGroupService);
    const sourceId = service.createSourceId('source');
    const targetId = service.createSourceId('target');

    service.publish('group-1', sourceId, 'market', 'DFM');

    const state = service.joinGroup('group-1', targetId, { market: 'ADX', sector: 'Banks' });

    expect(state['market']).toBe('DFM');
    expect(service.joinGroup('group-1', targetId, {})['sector']).toBe('Banks');
  });

  it('syncs current group state across window service instances', async () => {
    const sourceService = new LinkedFilterGroupService();
    const targetService = new LinkedFilterGroupService();
    const sourceId = sourceService.createSourceId('source-window');
    const targetId = targetService.createSourceId('target-window');
    const targetGroup = targetService.createGroupSubject('group-1');

    sourceService.publish('group-1', sourceId, 'market', 'DFM');
    const received = firstValueFrom(targetService.observe<string>(targetGroup, targetId, 'market').pipe(take(1)));
    targetService.joinGroup('group-1', targetId, { market: 'ADX' });

    await expectAsync(received).toBeResolvedTo('DFM');
    sourceService.ngOnDestroy();
    targetService.ngOnDestroy();
  });
});

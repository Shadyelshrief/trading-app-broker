import { TestBed } from '@angular/core/testing';

import { WORKSPACE_VERSION } from './workspace.models';
import { WorkspaceSerializerService } from './workspace-serializer.service';

describe('WorkspaceSerializerService', () => {
  let service: WorkspaceSerializerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkspaceSerializerService);
  });

  it('serializes the main layout without runtime popouts', () => {
    const workspace = service.serializeWorkspace({
      name: 'Desk',
      mainLayout: {
        root: { type: 'component', componentType: 'full-market', componentState: { market: 'ADX' } },
        openPopouts: [{ root: { type: 'component', componentType: 'charts' } }]
      }
    });

    expect(workspace.version).toBe(WORKSPACE_VERSION);
    expect((workspace.mainLayout as { openPopouts: unknown[] }).openPopouts).toEqual([]);
    expect(workspace.popouts).toEqual([]);
  });

  it('normalizes popout component state, link group, and geometry', () => {
    const workspace = service.serializeWorkspace({
      name: 'Multi monitor',
      mainLayout: { root: undefined },
      popouts: [{
        id: 'POP-CHART-1',
        layout: {
          root: {
            type: 'component',
            componentType: 'charts',
            title: 'Advanced Chart - IHC',
            componentState: {
              symbolId: 'IHC',
              market: 'ADX',
              context: { linkedFilterGroup: 'group-1' }
            }
          }
        },
        geometry: { left: 1920, top: 10, width: 960, height: 700 }
      }]
    });

    expect(workspace.popouts[0]).toEqual(jasmine.objectContaining({
      id: 'POP-CHART-1',
      componentType: 'charts',
      title: 'Advanced Chart - IHC',
      linkGroup: 'group-1',
      geometry: { left: 1920, top: 10, width: 960, height: 700 }
    }));
    expect(workspace.popouts[0].componentState['symbolId']).toBe('IHC');
  });

  it('migrates legacy Golden Layout JSON and rejects future versions safely', () => {
    const legacy = service.deserializeWorkspace({
      root: { type: 'component', componentType: 'full-market' },
      openPopouts: [{
        root: { type: 'component', componentType: 'time-sales', componentState: { market: 'DFM' } },
        window: { left: 120, top: 80, width: 800, height: 600 }
      }]
    }, { id: 'legacy', name: 'Legacy' });

    expect(legacy?.version).toBe(WORKSPACE_VERSION);
    expect(legacy?.popouts.length).toBe(1);
    expect(legacy?.popouts[0].componentType).toBe('time-sales');
    expect(service.deserializeWorkspace({ version: WORKSPACE_VERSION + 1, mainLayout: {}, popouts: [] })).toBeNull();
  });

  it('strips functions, DOM-like runtime fields, and circular references', () => {
    const runtime: Record<string, unknown> = {
      root: { type: 'component', componentType: 'charts', componentState: { timeframe: '1D' } },
      eventHub: { private: true },
      callback: () => undefined
    };
    runtime['cycle'] = runtime;

    const workspace = service.serializeWorkspace({ name: 'Safe', mainLayout: runtime });
    const serialized = workspace.mainLayout as Record<string, unknown>;

    expect(serialized['eventHub']).toBeUndefined();
    expect(serialized['callback']).toBeUndefined();
    expect(serialized['cycle']).toBeUndefined();
    expect(() => JSON.stringify(workspace)).not.toThrow();
  });
});

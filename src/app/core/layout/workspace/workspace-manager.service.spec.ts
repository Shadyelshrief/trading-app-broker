import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { WorkspaceManagerService } from './workspace-manager.service';
import { WorkspacePopoutHandle, WorkspacePopoutService } from './workspace-popout.service';
import { WORKSPACE_STORAGE_ADAPTER } from './workspace-storage.adapter';

describe('WorkspaceManagerService', () => {
  let service: WorkspaceManagerService;
  let popoutService: WorkspacePopoutService;
  const storage = {
    load: jasmine.createSpy('load').and.returnValue(of([])),
    save: jasmine.createSpy('save').and.callFake((workspace: object) => of([workspace]))
  };

  beforeEach(() => {
    storage.load.calls.reset();
    storage.save.calls.reset();
    TestBed.configureTestingModule({
      providers: [{ provide: WORKSPACE_STORAGE_ADAPTER, useValue: storage }]
    });
    service = TestBed.inject(WorkspaceManagerService);
    popoutService = TestBed.inject(WorkspacePopoutService);
  });

  afterEach(() => popoutService.closeAll());

  it('restores a workspace without popouts without invoking an opener', () => {
    service.deserializePreference(preference([]));
    const opener = jasmine.createSpy('opener');

    expect(service.restorePopouts(opener)).toEqual({ requested: 0, opened: 0, blocked: 0 });
    expect(opener).not.toHaveBeenCalled();
    expect(service.getRestoreState()).toBe('RESTORED');
  });

  it('restores saved popouts and prevents duplicate windows on repeated restore', () => {
    service.deserializePreference(preference([savedPopout('POP-1'), savedPopout('POP-2')]));
    const opener = jasmine.createSpy('opener').and.callFake(() => createHandle());

    expect(service.restorePopouts(opener)).toEqual({ requested: 2, opened: 2, blocked: 0 });
    expect(service.restorePopouts(opener)).toEqual({ requested: 2, opened: 2, blocked: 0 });
    expect(opener).toHaveBeenCalledTimes(2);
    expect(service.getRestoreState()).toBe('RESTORED');
  });

  it('tracks dirty state and clears it after save', () => {
    service.markDirty();
    expect(service.dirty()).toBeTrue();

    service.saveWorkspace({
      name: 'Desk',
      theme: 'DARK',
      languageId: 'en',
      mainLayout: { root: undefined },
      popouts: [],
      globalState: {}
    }).subscribe();

    expect(service.dirty()).toBeFalse();
    expect(storage.save).toHaveBeenCalled();
  });

  it('reports partial restoration when the browser blocks a window', () => {
    service.deserializePreference(preference([savedPopout('POP-1'), savedPopout('POP-2')]));
    let calls = 0;
    const opener = () => {
      calls += 1;
      if (calls === 2) {
        throw new Error('blocked');
      }
      return createHandle();
    };

    expect(service.restorePopouts(opener)).toEqual({ requested: 2, opened: 1, blocked: 1 });
    expect(service.getRestoreState()).toBe('PARTIAL');
    expect(service.pendingPopoutCount()).toBe(1);
  });
});

function preference(popouts: object[]) {
  return {
    id: 'workspace-1',
    name: 'Desk',
    layoutJson: {
      version: 2,
      id: 'workspace-1',
      name: 'Desk',
      mainLayout: { root: undefined },
      popouts,
      globalState: {}
    }
  };
}

function savedPopout(id: string) {
  return {
    id,
    componentType: 'charts',
    componentState: { symbolId: 'IHC' },
    geometry: { left: 10, top: 10, width: 800, height: 600 },
    layout: { root: { type: 'component', componentType: 'charts', componentState: { symbolId: 'IHC' } } }
  };
}

function createHandle(): WorkspacePopoutHandle {
  const child = {
    closed: false,
    focus: jasmine.createSpy('focus'),
    moveTo: jasmine.createSpy('moveTo'),
    resizeTo: jasmine.createSpy('resizeTo')
  } as unknown as Window;

  return {
    getWindow: () => child,
    toConfig: () => ({ root: { type: 'component', componentType: 'charts' } }),
    close: () => undefined
  };
}

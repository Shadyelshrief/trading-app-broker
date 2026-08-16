import { TestBed } from '@angular/core/testing';

import { SavedWorkspacePopout } from './workspace.models';
import { WorkspacePopoutHandle, WorkspacePopoutService } from './workspace-popout.service';

describe('WorkspacePopoutService', () => {
  let service: WorkspacePopoutService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WorkspacePopoutService);
  });

  afterEach(() => service.closeAll());

  it('opens and tracks a popout successfully', () => {
    const handle = createHandle();

    expect(service.open(savedPopout(), () => handle)).toBe('opened');
    expect(service.activeCount()).toBe(1);
    expect(handle.getWindow().focus).toHaveBeenCalled();
  });

  it('detects a blocked popup', () => {
    expect(service.open(savedPopout(), () => {
      throw new Error('Popout blocked');
    })).toBe('blocked');
    expect(service.activeCount()).toBe(0);
  });

  it('restores window geometry when browser APIs permit it', () => {
    const handle = createHandle();
    const child = handle.getWindow();

    service.open(savedPopout(), () => handle);

    expect(child.moveTo).toHaveBeenCalledWith(120, 80);
    expect(child.resizeTo).toHaveBeenCalledWith(900, 640);
  });

  it('focuses an existing saved popout instead of creating a duplicate', () => {
    const handle = createHandle();
    const opener = jasmine.createSpy('opener').and.returnValue(handle);

    expect(service.open(savedPopout(), opener)).toBe('opened');
    expect(service.open(savedPopout(), opener)).toBe('focused');
    expect(opener).toHaveBeenCalledTimes(1);
  });
});

function savedPopout(): SavedWorkspacePopout {
  return {
    id: 'POP-CHART-1',
    componentType: 'charts',
    componentState: { symbolId: 'IHC' },
    geometry: { left: 120, top: 80, width: 900, height: 640 },
    layout: { root: { type: 'component', componentType: 'charts' } }
  };
}

function createHandle(): WorkspacePopoutHandle {
  const child = {
    closed: false,
    outerWidth: 900,
    outerHeight: 640,
    screenX: 120,
    screenY: 80,
    focus: jasmine.createSpy('focus'),
    moveTo: jasmine.createSpy('moveTo'),
    resizeTo: jasmine.createSpy('resizeTo'),
    location: { assign: jasmine.createSpy('assign') }
  } as unknown as Window;

  return {
    getWindow: () => child,
    toConfig: () => ({ root: { type: 'component', componentType: 'charts' } }),
    close: jasmine.createSpy('close')
  };
}

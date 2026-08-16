import { Injectable } from '@angular/core';
import {
  SavedWorkspace,
  SavedWorkspacePopout,
  WORKSPACE_VERSION,
  WorkspaceGlobalState,
  WorkspacePopoutRuntimeSnapshot
} from './workspace.models';

const RUNTIME_ONLY_KEYS = new Set([
  '_layoutManager',
  '_popoutWindow',
  '__glInstance',
  'container',
  'element',
  'eventHub',
  'nativeElement'
]);

export interface SerializeWorkspaceInput {
  id?: string;
  name: string;
  mainLayout: unknown;
  popouts?: WorkspacePopoutRuntimeSnapshot[];
  globalState?: WorkspaceGlobalState;
  createdAt?: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceSerializerService {
  serializeWorkspace(input: SerializeWorkspaceInput): SavedWorkspace {
    const now = new Date().toISOString();
    const mainLayout = normalizeLayout(input.mainLayout, false);

    return {
      id: input.id ?? createWorkspaceId(),
      name: input.name,
      version: WORKSPACE_VERSION,
      mainLayout,
      popouts: (input.popouts ?? []).map((popout) => serializePopout(popout)),
      globalState: persistenceClone(input.globalState ?? {}) as WorkspaceGlobalState,
      createdAt: input.createdAt ?? now,
      updatedAt: now
    };
  }

  deserializeWorkspace(value: unknown, fallback: { id?: string; name?: string } = {}): SavedWorkspace | null {
    const migrated = this.migrateWorkspace(value, fallback);

    if (!migrated) {
      return null;
    }

    return {
      ...migrated,
      mainLayout: normalizeLayout(migrated.mainLayout, false),
      popouts: migrated.popouts.map((popout) => ({
        ...popout,
        componentState: persistenceClone(popout.componentState) as Record<string, unknown>,
        geometry: normalizeGeometry(popout.geometry),
        layout: normalizeLayout(popout.layout, true)
      })),
      globalState: persistenceClone(migrated.globalState) as WorkspaceGlobalState
    };
  }

  migrateWorkspace(value: unknown, fallback: { id?: string; name?: string } = {}): SavedWorkspace | null {
    if (!isRecord(value)) {
      return null;
    }

    // Legacy preferences stored a bare Golden Layout configuration in layoutJson.
    if (!('version' in value) && isGoldenLayoutConfig(value)) {
      return {
        id: fallback.id ?? createWorkspaceId(),
        name: fallback.name ?? 'Workspace',
        version: WORKSPACE_VERSION,
        mainLayout: normalizeLayout(value, false),
        popouts: readLegacyPopouts(value),
        globalState: {}
      };
    }

    const version = typeof value['version'] === 'number' ? value['version'] : 1;

    if (version > WORKSPACE_VERSION || !('mainLayout' in value)) {
      return null;
    }

    const rawPopouts = Array.isArray(value['popouts']) ? value['popouts'] : [];

    return {
      id: typeof value['id'] === 'string' ? value['id'] : fallback.id ?? createWorkspaceId(),
      name: typeof value['name'] === 'string' ? value['name'] : fallback.name ?? 'Workspace',
      version: WORKSPACE_VERSION,
      mainLayout: value['mainLayout'],
      popouts: rawPopouts.map(readSavedPopout).filter((item): item is SavedWorkspacePopout => item !== null),
      globalState: isRecord(value['globalState']) ? (value['globalState'] as WorkspaceGlobalState) : {},
      createdAt: typeof value['createdAt'] === 'string' ? value['createdAt'] : undefined,
      updatedAt: typeof value['updatedAt'] === 'string' ? value['updatedAt'] : undefined
    };
  }
}

function serializePopout(snapshot: WorkspacePopoutRuntimeSnapshot): SavedWorkspacePopout {
  const layout = normalizeLayout(snapshot.layout, true);
  const component = findFirstComponent(layout);
  const componentState = isRecord(component?.['componentState'])
    ? (persistenceClone(component?.['componentState']) as Record<string, unknown>)
    : {};
  const context = isRecord(componentState['context']) ? componentState['context'] : undefined;
  const linkGroup = firstString(componentState['linkGroup'], context?.['linkedFilterGroup']);

  return {
    id: snapshot.id,
    componentType: firstString(component?.['componentType']) ?? 'placeholder',
    componentState,
    title: firstString(component?.['title'], componentState['title']),
    linkGroup,
    geometry: normalizeGeometry(snapshot.geometry),
    monitor: {
      screenX: finiteNumber(snapshot.geometry.left),
      screenY: finiteNumber(snapshot.geometry.top)
    },
    layout
  };
}

function readLegacyPopouts(layout: Record<string, unknown>): SavedWorkspacePopout[] {
  const openPopouts = Array.isArray(layout['openPopouts']) ? layout['openPopouts'] : [];

  return openPopouts.map((popout, index) => {
    const record = isRecord(popout) ? popout : {};
    const windowConfig = isRecord(record['window']) ? record['window'] : {};
    return serializePopout({
      id: `legacy-popout-${index + 1}`,
      layout: record,
      geometry: normalizeGeometry(windowConfig)
    });
  });
}

function readSavedPopout(value: unknown, index: number): SavedWorkspacePopout | null {
  if (!isRecord(value)) {
    return null;
  }

  const layout = value['layout'] ?? {
    root: {
      type: 'component',
      componentType: firstString(value['componentType']) ?? 'placeholder',
      title: firstString(value['title']),
      componentState: isRecord(value['componentState']) ? value['componentState'] : {}
    }
  };

  const serialized = serializePopout({
    id: firstString(value['id']) ?? `popout-${index + 1}`,
    layout,
    geometry: normalizeGeometry(value['geometry'])
  });

  return {
    ...serialized,
    componentType: firstString(value['componentType']) ?? serialized.componentType,
    componentState: isRecord(value['componentState'])
      ? (persistenceClone(value['componentState']) as Record<string, unknown>)
      : serialized.componentState,
    title: firstString(value['title']) ?? serialized.title,
    linkGroup: firstString(value['linkGroup']) ?? serialized.linkGroup
  };
}

function normalizeLayout(value: unknown, keepWindow: boolean): unknown {
  const cloned = persistenceClone(value);

  if (!isRecord(cloned)) {
    return {};
  }

  if (!keepWindow) {
    cloned['openPopouts'] = [];
    delete cloned['window'];
    delete cloned['parentId'];
    delete cloned['indexInParent'];
  }

  return cloned;
}

function persistenceClone(value: unknown, seen = new WeakSet<object>()): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === 'undefined' || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => persistenceClone(item, seen)).filter((item) => item !== undefined);
  }

  if (typeof value !== 'object' || seen.has(value)) {
    return undefined;
  }

  seen.add(value);
  const result: Record<string, unknown> = {};

  for (const [key, child] of Object.entries(value)) {
    if (RUNTIME_ONLY_KEYS.has(key)) {
      continue;
    }

    const next = persistenceClone(child, seen);
    if (next !== undefined) {
      result[key] = next;
    }
  }

  seen.delete(value);
  return result;
}

function findFirstComponent(value: unknown): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value['type'] === 'component') {
    return value;
  }

  const rootResult = findFirstComponent(value['root']);
  if (rootResult) {
    return rootResult;
  }

  const content = value['content'];
  if (!Array.isArray(content)) {
    return undefined;
  }

  for (const child of content) {
    const result = findFirstComponent(child);
    if (result) {
      return result;
    }
  }

  return undefined;
}

function normalizeGeometry(value: unknown): SavedWorkspacePopout['geometry'] {
  const geometry = isRecord(value) ? value : {};
  return {
    left: finiteNumber(geometry['left']),
    top: finiteNumber(geometry['top']),
    width: positiveNumber(geometry['width']) ?? 720,
    height: positiveNumber(geometry['height']) ?? 520
  };
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : undefined;
}

function positiveNumber(value: unknown): number | undefined {
  const number = finiteNumber(value);
  return number !== undefined && number > 0 ? number : undefined;
}

function firstString(...values: unknown[]): string | undefined {
  return values.find((value): value is string => typeof value === 'string' && value.length > 0);
}

function isGoldenLayoutConfig(value: Record<string, unknown>): boolean {
  return 'root' in value || Array.isArray(value['content']);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function createWorkspaceId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `workspace-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Type,
  createComponent,
  inject
} from '@angular/core';
import {
  ComponentContainer,
  ComponentItemConfig,
  GoldenLayout,
  LayoutConfig,
  ResolvedComponentItemConfig,
  ResolvedLayoutConfig,
  VirtualLayout
} from 'golden-layout';

import { ChartPanelComponent } from '../../features/charts/chart-panel.component';
import { MarketDepthPanelComponent } from '../../features/market-depth/market-depth-panel.component';
import { OrdersPanelComponent } from '../../features/orders/orders-panel.component';
import { WatchlistPanelComponent } from '../../features/watchlist/watchlist-panel.component';

type PanelComponentType = 'watchlist' | 'chart' | 'market-depth' | 'orders';

interface PanelState {
  title: string;
  description?: string;
}

interface PanelComponentInstance {
  captureState?: () => PanelState | undefined;
}

@Injectable({ providedIn: 'root' })
export class LayoutService {
  private readonly applicationRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private readonly panelRegistry = {
    watchlist: WatchlistPanelComponent,
    chart: ChartPanelComponent,
    'market-depth': MarketDepthPanelComponent,
    orders: OrdersPanelComponent
  } satisfies Record<PanelComponentType, object>;

  private readonly componentRefs = new Map<ComponentContainer, ComponentRef<PanelComponentInstance>>();

  private layout?: GoldenLayout;
  private hostElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;

  readonly isSubWindow =
    typeof window !== 'undefined' &&
    new URL(window.location.href).searchParams.has('gl-window');

  init(hostElement: HTMLElement): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.layout && this.hostElement === hostElement) {
      this.syncSize();
      return;
    }

    this.destroy();

    this.hostElement = hostElement;
    this.layout = new GoldenLayout(hostElement, this.bindComponent, this.unbindComponent);

    if (!this.layout.isSubWindow) {
      this.layout.loadLayout(this.createDefaultLayout());
    }

    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(hostElement);

    queueMicrotask(() => this.syncSize());
  }

  resetLayout(): void {
    if (!this.layout) {
      return;
    }

    this.layout.loadLayout(this.createDefaultLayout());
    this.syncSize();
  }

  saveLayout(): ResolvedLayoutConfig | undefined {
    return this.layout?.saveLayout();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.layout?.destroy();
    this.layout = undefined;

    for (const componentRef of this.componentRefs.values()) {
      this.applicationRef.detachView(componentRef.hostView);
      componentRef.destroy();
    }

    this.componentRefs.clear();
    this.hostElement = undefined;
  }

  private readonly bindComponent: VirtualLayout.BindComponentEventHandler = (
    container,
    itemConfig
  ) => {
    const typeName = this.resolvePanelType(itemConfig);
    const componentType = this.panelRegistry[typeName] as Type<PanelComponentInstance>;
    const componentRef = createComponent(componentType, {
      environmentInjector: this.environmentInjector,
      hostElement: container.element
    });

    const state = this.resolveState(itemConfig, typeName);

    componentRef.setInput('state', state);
    this.applicationRef.attachView(componentRef.hostView);
    componentRef.changeDetectorRef.detectChanges();

    container.stateRequestEvent = () => componentRef.instance.captureState?.() ?? state;
    this.componentRefs.set(container, componentRef);

    return {
      component: componentRef,
      virtual: false
    };
  };

  private readonly unbindComponent: VirtualLayout.UnbindComponentEventHandler = (container) => {
    const componentRef = this.componentRefs.get(container);

    if (!componentRef) {
      return;
    }

    this.applicationRef.detachView(componentRef.hostView);
    componentRef.destroy();
    this.componentRefs.delete(container);
  };

  private syncSize(): void {
    if (!this.layout || !this.hostElement) {
      return;
    }

    const { width, height } = this.hostElement.getBoundingClientRect();

    if (width > 0 && height > 0) {
      this.layout.setSize(width, height);
    }
  }

  private resolvePanelType(itemConfig: ResolvedComponentItemConfig): PanelComponentType {
    const componentType = itemConfig.componentType;

    if (
      componentType === 'watchlist' ||
      componentType === 'chart' ||
      componentType === 'market-depth' ||
      componentType === 'orders'
    ) {
      return componentType;
    }

    throw new Error(`Unknown Golden Layout component type: ${String(componentType)}`);
  }

  private resolveState(
    itemConfig: ResolvedComponentItemConfig,
    typeName: PanelComponentType
  ): PanelState {
    const state = itemConfig.componentState;

    if (state && typeof state === 'object' && !Array.isArray(state)) {
      const title =
        'title' in state && typeof state['title'] === 'string'
          ? state['title']
          : this.defaultTitle(typeName);
      const description =
        'description' in state && typeof state['description'] === 'string'
          ? state['description']
          : undefined;

      return { title, description };
    }

    return { title: this.defaultTitle(typeName) };
  }

  private createDefaultLayout(): LayoutConfig {
    return {
      root: {
        type: 'column',
        content: [
          {
            type: 'row',
            content: [
              this.createPanelConfig('watchlist', 'Watchlist', 22),
              this.createPanelConfig('chart', 'Chart', 56),
              this.createPanelConfig('market-depth', 'Market Depth', 22)
            ]
          },
          {
            type: 'stack',
            size: '28%',
            activeItemIndex: 0,
            content: [this.createPanelConfig('orders', 'Orders')]
          }
        ]
      },
      settings: {
        reorderEnabled: true,
        popoutWholeStack: false,
        constrainDragToContainer: true,
        blockedPopoutsThrowError: false,
        closePopoutsOnUnload: true,
        tabOverlapAllowance: 0,
        reorderOnTabMenuClick: true,
        popInOnClose: true
      },
      dimensions: {
        borderWidth: 6,
        borderGrabWidth: 10,
        headerHeight: 34,
        defaultMinItemHeight: '180px',
        defaultMinItemWidth: '240px',
        dragProxyWidth: 360,
        dragProxyHeight: 240
      },
      header: {
        show: 'top',
        popout: 'Open in window',
        popin: 'Dock panel',
        maximise: 'Maximise',
        close: 'Close',
        minimise: 'Minimise',
        tabDropdown: 'More tabs'
      }
    };
  }

  private createPanelConfig(
    componentType: PanelComponentType,
    title: string,
    size?: number
  ): ComponentItemConfig {
    return {
      type: 'component' as const,
      componentType,
      title,
      size: size === undefined ? undefined : `${size}%`,
      isClosable: true,
      componentState: {
        title,
        description: `${title} panel`
      }
    };
  }

  private defaultTitle(typeName: PanelComponentType): string {
    switch (typeName) {
      case 'watchlist':
        return 'Watchlist';
      case 'chart':
        return 'Chart';
      case 'market-depth':
        return 'Market Depth';
      case 'orders':
        return 'Orders';
    }
  }
}

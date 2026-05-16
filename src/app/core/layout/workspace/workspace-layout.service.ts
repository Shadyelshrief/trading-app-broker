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
  VirtualLayout
} from 'golden-layout';

import { MarketChartsPageComponent } from '../../../charts/pages/market-charts-page.component';
import { FullMarketPageComponent } from '../../../market/full-market/full-market-page.component';
import { buildReferenceFullMarketRows } from '../../../market/full-market/full-market-reference.data';
import { MarketSummaryComponent } from '../../../market/market-summary/market-summary.component';
import { PriceQuoteComponent } from '../../../market/price-quote/price-quote.component';
import { WatchlistsPageComponent } from '../../../watchlists/pages/watchlists-page.component';
import { DashboardWidgetComponent } from '../widgets/dashboard-widget.component';
import { PlaceholderWidgetComponent } from '../widgets/placeholder-widget.component';

type WorkspacePanelType =
  | 'dashboard'
  | 'full-market'
  | 'market-summary'
  | 'price-quote'
  | 'watchlists'
  | 'charts'
  | 'placeholder';

interface WorkspacePanelState {
  title: string;
  route: string;
  section?: string;
  screen?: string;
  context?: Record<string, unknown>;
}

interface WorkspaceWidgetInstance {
  captureState?: () => WorkspacePanelState | undefined;
}

interface WorkspacePanelDescriptor {
  type: WorkspacePanelType;
  state: WorkspacePanelState;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceLayoutService {
  private readonly applicationRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);

  private readonly panelRegistry = {
    dashboard: DashboardWidgetComponent,
    'full-market': FullMarketPageComponent,
    'market-summary': MarketSummaryComponent,
    'price-quote': PriceQuoteComponent,
    watchlists: WatchlistsPageComponent,
    charts: MarketChartsPageComponent,
    placeholder: PlaceholderWidgetComponent
  } satisfies Record<WorkspacePanelType, object>;

  private readonly componentRefs = new Map<ComponentContainer, ComponentRef<WorkspaceWidgetInstance>>();
  private readonly openPanels = new Map<string, WorkspacePanelDescriptor>();

  private layout?: GoldenLayout;
  private hostElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private activeRoute = '/app';

  init(hostElement: HTMLElement): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.layout && this.hostElement === hostElement) {
      this.loadCurrentLayout();
      this.syncSize();
      return;
    }

    this.destroy();

    this.hostElement = hostElement;
    this.layout = new GoldenLayout(hostElement, this.bindComponent, this.unbindComponent);
    this.loadCurrentLayout();

    this.resizeObserver = new ResizeObserver(() => this.syncSize());
    this.resizeObserver.observe(hostElement);
    queueMicrotask(() => this.syncSize());
  }

  openRoute(route: string): void {
    const normalizedRoute = this.normalizeRoute(route);
    this.activeRoute = normalizedRoute;

    if (!this.openPanels.has(normalizedRoute)) {
      this.openPanels.set(normalizedRoute, this.routeToPanel(normalizedRoute));
    }

    this.loadCurrentLayout();
    this.syncSize();
  }

  openPanel(panel: WorkspacePanelDescriptor): void {
    const normalizedRoute = this.normalizeRoute(panel.state.route);
    this.activeRoute = normalizedRoute;
    this.openPanels.set(normalizedRoute, {
      ...panel,
      state: {
        ...panel.state,
        route: normalizedRoute
      }
    });
    this.loadCurrentLayout();
    this.syncSize();
  }

  resetLayout(): void {
    const activeDescriptor = this.openPanels.get(this.activeRoute) ?? this.routeToPanel(this.activeRoute);
    this.openPanels.clear();
    this.openPanels.set(activeDescriptor.state.route, activeDescriptor);
    this.loadCurrentLayout();
    this.syncSize();
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

  private readonly bindComponent: VirtualLayout.BindComponentEventHandler = (container, itemConfig) => {
    const typeName = this.resolvePanelType(itemConfig);
    const componentType = this.panelRegistry[typeName] as Type<WorkspaceWidgetInstance>;
    const componentRef = createComponent(componentType, {
      environmentInjector: this.environmentInjector,
      hostElement: container.element
    });
    const state = this.resolveState(itemConfig);

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

  private loadCurrentLayout(): void {
    if (!this.layout) {
      return;
    }

    if (this.openPanels.size === 0) {
      this.openPanels.set('/app', this.routeToPanel('/app'));
    }

    const panels = Array.from(this.openPanels.values());
    const activeItemIndex = Math.max(
      0,
      panels.findIndex((panel) => panel.state.route === this.activeRoute)
    );

    const layoutConfig: LayoutConfig = {
      root: {
        type: 'stack',
        activeItemIndex,
        content: panels.map((panel) => this.createPanelConfig(panel))
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
        defaultMinItemWidth: '280px',
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

    this.layout.loadLayout(layoutConfig);
  }

  private createPanelConfig(panel: WorkspacePanelDescriptor): ComponentItemConfig {
    return {
      type: 'component',
      componentType: panel.type,
      title: panel.state.title,
      isClosable: panel.state.route !== '/app',
      componentState: panel.state
    };
  }

  private resolvePanelType(itemConfig: ResolvedComponentItemConfig): WorkspacePanelType {
    const componentType = itemConfig.componentType;

    if (
      componentType === 'dashboard' ||
      componentType === 'full-market' ||
      componentType === 'market-summary' ||
      componentType === 'price-quote' ||
      componentType === 'watchlists' ||
      componentType === 'charts' ||
      componentType === 'placeholder'
    ) {
      return componentType;
    }

    return 'placeholder';
  }

  private resolveState(itemConfig: ResolvedComponentItemConfig): WorkspacePanelState {
    const rawState = itemConfig.componentState;

    if (rawState && typeof rawState === 'object' && !Array.isArray(rawState)) {
      const stateRecord = rawState as Record<string, unknown>;

      return {
        title: typeof stateRecord['title'] === 'string' ? stateRecord['title'] : itemConfig.title ?? 'Workspace',
        route: typeof stateRecord['route'] === 'string' ? stateRecord['route'] : '/app',
        section: typeof stateRecord['section'] === 'string' ? stateRecord['section'] : undefined,
        screen: typeof stateRecord['screen'] === 'string' ? stateRecord['screen'] : undefined,
        context:
          stateRecord['context'] && typeof stateRecord['context'] === 'object' && !Array.isArray(stateRecord['context'])
            ? (stateRecord['context'] as Record<string, unknown>)
            : undefined
      };
    }

    return {
      title: itemConfig.title ?? 'Workspace',
      route: '/app'
    };
  }

  private routeToPanel(route: string): WorkspacePanelDescriptor {
    const normalizedRoute = this.normalizeRoute(route);
    const routeWithoutRoot = normalizedRoute.replace(/^\/app\/?/, '');

    if (!routeWithoutRoot) {
      return {
        type: 'dashboard',
        state: {
          title: 'Dashboard',
          route: '/app'
        }
      };
    }

    if (routeWithoutRoot === 'pricing/full-market') {
      return {
        type: 'full-market',
        state: {
          title: 'Full Market',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/market-summary') {
      return {
        type: 'market-summary',
        state: {
          title: 'Market Summary',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot.startsWith('pricing/price-quote')) {
      const segments = routeWithoutRoot.split('/');
      const market = segments[2]?.toUpperCase() ?? 'ADX';
      const symbolId = segments[3]?.toUpperCase();
      const referenceRow = symbolId
        ? buildReferenceFullMarketRows(market).find((row) => row.symbolId === symbolId)
        : undefined;

      return {
        type: 'price-quote',
        state: {
          title: symbolId ? `Price Quote - ${symbolId}` : 'Price Quote',
          route: normalizedRoute,
          section: 'pricing',
          screen: 'price-quote',
          context:
            referenceRow !== undefined
              ? { quote: referenceRow }
              : symbolId
                ? { quote: { symbolId, market } }
                : undefined
        }
      };
    }

    if (routeWithoutRoot === 'pricing/watch-lists') {
      return {
        type: 'watchlists',
        state: {
          title: 'Watch Lists',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/charts') {
      return {
        type: 'charts',
        state: {
          title: 'Charts',
          route: normalizedRoute
        }
      };
    }

    const segments = routeWithoutRoot.split('/');
    const section = segments[0] ?? 'module';
    const screen = segments[1] ?? section;

    return {
      type: 'placeholder',
      state: {
        title: this.humanize(screen),
        route: normalizedRoute,
        section,
        screen
      }
    };
  }

  private normalizeRoute(route: string): string {
    const [path] = route.split('?');
    return path.replace(/\/+$/, '') || '/app';
  }

  private humanize(value: string): string {
    return value
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private syncSize(): void {
    if (!this.layout || !this.hostElement) {
      return;
    }

    const { width, height } = this.hostElement.getBoundingClientRect();

    if (width > 0 && height > 0) {
      this.layout.setSize(width, height);
    }
  }
}

import {
  ApplicationRef,
  ComponentRef,
  EnvironmentInjector,
  Injectable,
  Type,
  createComponent,
  inject,
  signal
} from '@angular/core';
import {
  ComponentContainer,
  ComponentItemConfig,
  GoldenLayout,
  LayoutConfig,
  ResolvedLayoutConfig,
  ResolvedComponentItemConfig,
  VirtualLayout
} from 'golden-layout';
import { catchError, debounceTime, EMPTY, finalize, Subject, switchMap, take, tap } from 'rxjs';

import { ClientInformationComponent } from '../../../clients/client-information/client-information.component';
import { ClientSearchComponent } from '../../../clients/client-search/client-search.component';
import { MarketChartsPageComponent } from '../../../charts/pages/market-charts-page.component';
import { FullMarketPageComponent } from '../../../market/full-market/full-market-page.component';
import { buildReferenceFullMarketRows } from '../../../market/full-market/full-market-reference.data';
import { HistoricalTopSymbolsComponent } from '../../../market/historical-top-symbols/historical-top-symbols.component';
import { MarketMapComponent } from '../../../market/market-map/market-map.component';
import { MarketDepthByOrderComponent } from '../../../market/market-depth-by-order/market-depth-by-order.component';
import { MarketDepthByPriceComponent } from '../../../market/market-depth-by-price/market-depth-by-price.component';
import { MarketIndicesComponent } from '../../../market/market-indices/market-indices.component';
import { MarketSummaryComponent } from '../../../market/market-summary/market-summary.component';
import { NewsAnnouncementsComponent } from '../../../market/news-announcements/news-announcements.component';
import { PriceSpectrumComponent } from '../../../market/price-spectrum/price-spectrum.component';
import { PriceQuoteComponent } from '../../../market/price-quote/price-quote.component';
import { TopSymbolsComponent } from '../../../market/top-symbols/top-symbols.component';
import { TimeSalesComponent } from '../../../market/time-sales/time-sales.component';
import { IndicesPerformanceComponent } from '../../../market-performance/indices-performance/indices-performance.component';
import { SecurityPerformanceComponent } from '../../../market-performance/security-performance/security-performance.component';
import { PortfolioPositioningComponent } from '../../../portfolio/portfolio-positioning/portfolio-positioning.component';
import { AnnouncementsTickerComponent } from '../../../tickers/announcements-ticker/announcements-ticker.component';
import { OrderEntryComponent } from '../../../trading/order-entry/order-entry.component';
import { OrderMonitoringComponent } from '../../../trading/order-monitoring/order-monitoring.component';
import { OrderStatisticsComponent } from '../../../trading/order-statistics/order-statistics.component';
import { PricingTickerComponent } from '../../../tickers/pricing-ticker/pricing-ticker.component';
import { TradingTickerComponent } from '../../../tickers/trading-ticker/trading-ticker.component';
import { ExecutionTickerComponent } from '../../../trading/execution-ticker/execution-ticker.component';
import { SavedWatchListComponent } from '../../../watchlists/saved-watch-list/saved-watch-list.component';
import { WatchlistsPageComponent } from '../../../watchlists/pages/watchlists-page.component';
import { DashboardWidgetComponent } from '../widgets/dashboard-widget.component';
import { PlaceholderWidgetComponent } from '../widgets/placeholder-widget.component';
import { WorkspacePreferencesService, WorkspaceThemePreference } from './workspace-preferences.service';

type WorkspacePanelType =
  | 'dashboard'
  | 'full-market'
  | 'market-indices'
  | 'market-summary'
  | 'top-symbols'
  | 'historical-top-symbols'
  | 'news-announcements'
  | 'market-map'
  | 'market-performance-indices'
  | 'market-performance-security'
  | 'market-depth-by-price'
  | 'market-depth-by-order'
  | 'price-spectrum'
  | 'time-sales'
  | 'trading-ticker'
  | 'pricing-ticker'
  | 'announcements-ticker'
  | 'execution-ticker'
  | 'order-entry'
  | 'order-monitoring'
  | 'order-statistics'
  | 'portfolio-positioning'
  | 'client-search'
  | 'client-information'
  | 'price-quote'
  | 'watchlists'
  | 'saved-watch-list'
  | 'charts'
  | 'placeholder';

const WORKSPACE_PANEL_TYPES = [
  'dashboard',
  'full-market',
  'market-indices',
  'market-summary',
  'top-symbols',
  'historical-top-symbols',
  'news-announcements',
  'market-map',
  'market-performance-indices',
  'market-performance-security',
  'market-depth-by-price',
  'market-depth-by-order',
  'price-spectrum',
  'time-sales',
  'trading-ticker',
  'pricing-ticker',
  'announcements-ticker',
  'execution-ticker',
  'order-entry',
  'order-monitoring',
  'order-statistics',
  'portfolio-positioning',
  'client-search',
  'client-information',
  'price-quote',
  'watchlists',
  'saved-watch-list',
  'charts',
  'placeholder'
] satisfies WorkspacePanelType[];

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
  private readonly preferences = inject(WorkspacePreferencesService);

  private readonly panelRegistry = {
    dashboard: DashboardWidgetComponent,
    'full-market': FullMarketPageComponent,
    'market-indices': MarketIndicesComponent,
    'market-summary': MarketSummaryComponent,
    'top-symbols': TopSymbolsComponent,
    'historical-top-symbols': HistoricalTopSymbolsComponent,
    'news-announcements': NewsAnnouncementsComponent,
    'market-map': MarketMapComponent,
    'market-performance-indices': IndicesPerformanceComponent,
    'market-performance-security': SecurityPerformanceComponent,
    'market-depth-by-price': MarketDepthByPriceComponent,
    'market-depth-by-order': MarketDepthByOrderComponent,
    'price-spectrum': PriceSpectrumComponent,
    'time-sales': TimeSalesComponent,
    'trading-ticker': TradingTickerComponent,
    'pricing-ticker': PricingTickerComponent,
    'announcements-ticker': AnnouncementsTickerComponent,
    'execution-ticker': ExecutionTickerComponent,
    'order-entry': OrderEntryComponent,
    'order-monitoring': OrderMonitoringComponent,
    'order-statistics': OrderStatisticsComponent,
    'portfolio-positioning': PortfolioPositioningComponent,
    'client-search': ClientSearchComponent,
    'client-information': ClientInformationComponent,
    'price-quote': PriceQuoteComponent,
    watchlists: WatchlistsPageComponent,
    'saved-watch-list': SavedWatchListComponent,
    charts: MarketChartsPageComponent,
    placeholder: PlaceholderWidgetComponent
  } satisfies Record<WorkspacePanelType, object>;

  private readonly componentRefs = new Map<ComponentContainer, ComponentRef<WorkspaceWidgetInstance>>();
  private readonly openPanels = new Map<string, WorkspacePanelDescriptor>();

  private layout?: GoldenLayout;
  private hostElement?: HTMLElement;
  private resizeObserver?: ResizeObserver;
  private activeRoute = '/app';
  private languageId = '00000000-0000-0000-0000-000000000000';
  private theme: WorkspaceThemePreference = 'DARK';
  private loadingRemoteLayout = false;
  private suppressNextSave = false;
  private workspaceLoaded = false;
  private readonly saveRequests = new Subject<void>();

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.saveRequests
      .pipe(
        debounceTime(500),
        switchMap(() => this.saveWorkspace())
      )
      .subscribe();
  }

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
    this.layout.on('stateChanged', this.onLayoutStateChanged);
    this.workspaceLoaded = false;
    this.loadWorkspace();

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

    if (!this.workspaceLoaded) {
      return;
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

    if (!this.workspaceLoaded) {
      return;
    }

    this.loadCurrentLayout();
    this.syncSize();
  }

  resetLayout(): void {
    const activeDescriptor = this.openPanels.get(this.activeRoute) ?? this.routeToPanel(this.activeRoute);
    this.openPanels.clear();
    this.openPanels.set(activeDescriptor.state.route, activeDescriptor);
    this.loadCurrentLayout();
    this.syncSize();
    this.queueSave();
  }

  destroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = undefined;

    this.layout?.off('stateChanged', this.onLayoutStateChanged);
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

  private loadSavedLayout(layoutConfig: LayoutConfig): void {
    if (!this.layout) {
      return;
    }

    this.loadingRemoteLayout = true;
    this.suppressNextSave = true;
    this.layout.loadLayout(layoutConfig);
    this.loadingRemoteLayout = false;
    this.rebuildOpenPanelsFromLayout();
  }

  private loadWorkspace(): void {
    this.loading.set(true);
    this.error.set(null);

    this.preferences
      .getPreferences()
      .pipe(
        take(1),
        tap((preferences) => {
          this.languageId = preferences.languageId || this.languageId;
          this.theme = preferences.theme || this.theme;
          this.workspaceLoaded = true;

          if (isLayoutConfig(preferences.layoutJson)) {
            this.loadSavedLayout(preferences.layoutJson);
            if (!this.openPanels.has(this.activeRoute)) {
              this.openPanels.set(this.activeRoute, this.routeToPanel(this.activeRoute));
              this.loadCurrentLayout();
            }
          } else {
            this.loadCurrentLayout();
          }

          this.syncSize();
        }),
        catchError(() => {
          this.error.set('Workspace preferences could not be loaded.');
          this.workspaceLoaded = true;
          this.loadCurrentLayout();
          this.syncSize();
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();
  }

  private readonly onLayoutStateChanged = (): void => {
    if (this.loadingRemoteLayout) {
      return;
    }

    if (this.suppressNextSave) {
      this.suppressNextSave = false;
      return;
    }

    this.rebuildOpenPanelsFromLayout();
    this.queueSave();
  };

  private queueSave(): void {
    if (this.layout) {
      this.saveRequests.next();
    }
  }

  private saveWorkspace() {
    if (!this.layout) {
      return EMPTY;
    }

    this.saving.set(true);

    return this.preferences
      .savePreferences({
        theme: this.theme,
        languageId: this.languageId,
        layoutJson: this.layout.saveLayout()
      })
      .pipe(
        tap((preferences) => {
          this.languageId = preferences.languageId || this.languageId;
          this.theme = preferences.theme || this.theme;
          this.error.set(null);
        }),
        catchError(() => {
          this.error.set('Workspace preferences could not be saved.');
          return EMPTY;
        }),
        finalize(() => this.saving.set(false))
      );
  }

  private rebuildOpenPanelsFromLayout(): void {
    const saved = this.layout?.saveLayout();
    const panels = saved?.root ? collectPanels(saved.root) : [];

    if (panels.length === 0) {
      return;
    }

    this.openPanels.clear();

    for (const panel of panels) {
      const normalizedRoute = this.normalizeRoute(panel.state.route);
      this.openPanels.set(normalizedRoute, {
        ...panel,
        state: {
          ...panel.state,
          route: normalizedRoute
        }
      });
    }
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

    if (typeof componentType === 'string' && isWorkspacePanelType(componentType)) {
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

    if (routeWithoutRoot === 'pricing/market-indices') {
      return {
        type: 'market-indices',
        state: {
          title: 'Market Indices',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/time-and-sales') {
      return {
        type: 'time-sales',
        state: {
          title: 'Time & Sales',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/trading-ticker') {
      return {
        type: 'trading-ticker',
        state: {
          title: 'Trading Ticker',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/pricing-ticker' || routeWithoutRoot === 'pricing/tickers') {
      return {
        type: 'pricing-ticker',
        state: {
          title: 'Pricing Ticker',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/announcements-ticker') {
      return {
        type: 'announcements-ticker',
        state: {
          title: 'Announcements Ticker',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'trading/execution-ticker') {
      return {
        type: 'execution-ticker',
        state: {
          title: 'Execution Ticker',
          route: normalizedRoute,
          section: 'trading',
          screen: 'execution-ticker'
        }
      };
    }

    if (routeWithoutRoot === 'trading/order-entry' || routeWithoutRoot.startsWith('trading/order-entry/')) {
      return {
        type: 'order-entry',
        state: {
          title: routeWithoutRoot.includes('/modify/') ? 'Modify Order' : 'Order Entry',
          route: normalizedRoute,
          section: 'trading',
          screen: 'order-entry'
        }
      };
    }

    if (routeWithoutRoot === 'trading/order-monitor') {
      return {
        type: 'order-monitoring',
        state: {
          title: 'Order Monitor',
          route: normalizedRoute,
          section: 'trading',
          screen: 'order-monitoring'
        }
      };
    }

    if (routeWithoutRoot === 'trading/order-statistics') {
      return {
        type: 'order-statistics',
        state: {
          title: 'Order Statistics',
          route: normalizedRoute,
          section: 'trading',
          screen: 'order-statistics'
        }
      };
    }

    if (routeWithoutRoot === 'trading/portfolio-position' || routeWithoutRoot.startsWith('trading/portfolio-position/')) {
      const clientId = routeWithoutRoot.split('/')[2];

      return {
        type: 'portfolio-positioning',
        state: {
          title: clientId ? `Portfolio Positioning - ${clientId.toUpperCase()}` : 'Portfolio Positioning',
          route: normalizedRoute,
          section: 'trading',
          screen: 'portfolio-positioning',
          context: clientId ? { clientId: decodeURIComponent(clientId) } : undefined
        }
      };
    }

    if (routeWithoutRoot === 'management/client-search') {
      return {
        type: 'client-search',
        state: {
          title: 'Client Search',
          route: normalizedRoute,
          section: 'management',
          screen: 'client-search'
        }
      };
    }

    if (routeWithoutRoot === 'management/client-information' || routeWithoutRoot.startsWith('management/client-information/')) {
      const clientId = routeWithoutRoot.split('/')[2];

      return {
        type: 'client-information',
        state: {
          title: clientId ? `Client Information - ${clientId.toUpperCase()}` : 'Client Information',
          route: normalizedRoute,
          section: 'management',
          screen: 'client-information',
          context: clientId ? { clientId: decodeURIComponent(clientId) } : undefined
        }
      };
    }

    if (routeWithoutRoot === 'pricing/top-symbols') {
      return {
        type: 'top-symbols',
        state: {
          title: 'Top Symbols',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/historical-top-symbols') {
      return {
        type: 'historical-top-symbols',
        state: {
          title: 'Historical Top Symbols',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/news-announcements') {
      return {
        type: 'news-announcements',
        state: {
          title: 'News & Announcements',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/market-map') {
      return {
        type: 'market-map',
        state: {
          title: 'Market Map',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/market-performance-indices') {
      return {
        type: 'market-performance-indices',
        state: {
          title: 'Market Performance Indices',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/market-performance-security') {
      return {
        type: 'market-performance-security',
        state: {
          title: 'Market Performance Security',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/market-depth-by-price') {
      return {
        type: 'market-depth-by-price',
        state: {
          title: 'Market Depth By Price',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/market-depth-by-order') {
      return {
        type: 'market-depth-by-order',
        state: {
          title: 'Market Depth By Order',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/price-spectrum') {
      return {
        type: 'price-spectrum',
        state: {
          title: 'Price Spectrum',
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

    if (routeWithoutRoot === 'pricing/watch-lists' || routeWithoutRoot === 'pricing/saved-watch-lists') {
      return {
        type: 'watchlists',
        state: {
          title: 'Saved Watch Lists',
          route: normalizedRoute
        }
      };
    }

    if (routeWithoutRoot === 'pricing/create-watch-list') {
      return {
        type: 'watchlists',
        state: {
          title: 'Create Watch List',
          route: normalizedRoute,
          section: 'pricing',
          screen: 'create-watch-list',
          context: { action: 'create' }
        }
      };
    }

    if (routeWithoutRoot.startsWith('pricing/watch-lists/')) {
      const watchListId = routeWithoutRoot.split('/')[2] ?? '';

      return {
        type: 'saved-watch-list',
        state: {
          title: 'Saved Watch List',
          route: normalizedRoute,
          section: 'pricing',
          screen: 'saved-watch-list',
          context: { watchListId }
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

function isWorkspacePanelType(value: string): value is WorkspacePanelType {
  return WORKSPACE_PANEL_TYPES.includes(value as WorkspacePanelType);
}

function isLayoutConfig(value: unknown): value is LayoutConfig {
  return !!value && typeof value === 'object' && 'root' in value;
}

function collectPanels(item: NonNullable<ResolvedLayoutConfig['root']>): WorkspacePanelDescriptor[] {
  const itemRecord = item as unknown as Record<string, unknown>;

  if (itemRecord['type'] === 'component') {
    const componentType = itemRecord['componentType'];

    if (typeof componentType === 'string' && isWorkspacePanelType(componentType)) {
      return [
        {
          type: componentType,
          state: resolvePanelState(itemRecord)
        }
      ];
    }
  }

  const content = itemRecord['content'];

  if (!Array.isArray(content)) {
    return [];
  }

  return content.flatMap((child) => collectPanels(child as NonNullable<ResolvedLayoutConfig['root']>));
}

function resolvePanelState(itemRecord: Record<string, unknown>): WorkspacePanelState {
  const rawState = itemRecord['componentState'];
  const stateRecord = rawState && typeof rawState === 'object' && !Array.isArray(rawState)
    ? (rawState as Record<string, unknown>)
    : {};

  return {
    title: typeof stateRecord['title'] === 'string'
      ? stateRecord['title']
      : typeof itemRecord['title'] === 'string'
        ? itemRecord['title']
        : 'Workspace',
    route: typeof stateRecord['route'] === 'string' ? stateRecord['route'] : '/app',
    section: typeof stateRecord['section'] === 'string' ? stateRecord['section'] : undefined,
    screen: typeof stateRecord['screen'] === 'string' ? stateRecord['screen'] : undefined,
    context:
      stateRecord['context'] && typeof stateRecord['context'] === 'object' && !Array.isArray(stateRecord['context'])
        ? (stateRecord['context'] as Record<string, unknown>)
        : undefined
  };
}

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
  DragSource,
  GoldenLayout,
  LayoutConfig,
  LayoutManager,
  ResolvedLayoutConfig,
  ResolvedComponentItemConfig,
  VirtualLayout
} from 'golden-layout';
import { catchError, EMPTY, finalize, of, switchMap, take, tap, timeout } from 'rxjs';

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
import { ReferenceDataLookupsService } from '../../../shared/lookups/reference-data-lookups.service';
import { DashboardWidgetComponent } from '../widgets/dashboard-widget.component';
import { HeaderMarketStatusComponent } from '../trading-header/header-market-status.component';
import { PlaceholderWidgetComponent } from '../widgets/placeholder-widget.component';
import {
  SaveWorkspacePreferences,
  WorkspacePreferences,
  WorkspacePreferencesService,
  WorkspaceThemePreference
} from './workspace-preferences.service';

type WorkspacePanelType =
  | 'dashboard'
  | 'market-status'
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
  'market-status',
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

const DEFAULT_WORKSPACE_PANELS = [
  createWorkspacePanel('full-market', 'Full Market', '/app/pricing/full-market'),
  createWorkspacePanel('market-indices', 'Market Indices', '/app/pricing/market-indices'),
  createWorkspacePanel('price-spectrum', 'Price Spectrum', '/app/pricing/price-spectrum'),
  createWorkspacePanel('market-depth-by-order', 'Market Depth By Order', '/app/pricing/market-depth-by-order')
] satisfies WorkspacePanelDescriptor[];

const MAX_VISIBLE_WORKSPACE_PANELS = 4;

@Injectable({ providedIn: 'root' })
export class WorkspaceLayoutService {
  private readonly applicationRef = inject(ApplicationRef);
  private readonly environmentInjector = inject(EnvironmentInjector);
  private readonly preferences = inject(WorkspacePreferencesService);
  private readonly referenceData = inject(ReferenceDataLookupsService);

  private readonly panelRegistry = {
    dashboard: DashboardWidgetComponent,
    'market-status': HeaderMarketStatusComponent,
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
  private readonly dragSources = new Map<HTMLElement, DragSource>();
  private readonly dragSourceConfigs = new Map<HTMLElement, () => ComponentItemConfig>();

  private layout?: GoldenLayout;
  private hostElement?: HTMLElement;
  private activeRoute = '/app';
  private languageId = '00000000-0000-0000-0000-000000000000';
  private theme: WorkspaceThemePreference = 'DARK';
  private loadingRemoteLayout = false;
  private suppressNextSave = false;
  private ignoreLayoutChangesUntil = 0;
  private workspaceLoaded = false;
  private isPopoutWindow = false;

  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly workspaces = signal<WorkspacePreferences[]>([]);
  readonly selectedWorkspaceId = signal<string | null>(null);
  readonly launcherPanels = DEFAULT_WORKSPACE_PANELS;

  init(hostElement: HTMLElement): void {
    if (typeof window === 'undefined') {
      return;
    }

    if (this.layout && this.hostElement === hostElement) {
      if (!this.isPopoutWindow) {
        this.loadCurrentLayout();
      }
      this.syncSize();
      return;
    }

    this.destroy();

    this.hostElement = hostElement;
    this.layout = new GoldenLayout(hostElement, this.bindComponent, this.unbindComponent);
    this.layout.resizeWithContainerAutomatically = true;
    this.layout.on('stateChanged', this.onLayoutStateChanged);
    this.isPopoutWindow = this.layout.isSubWindow;
    this.workspaceLoaded = false;

    if (this.isPopoutWindow) {
      this.workspaceLoaded = true;
      this.loading.set(false);
      this.error.set(null);
      this.setPopoutBodyClass(true);
      queueMicrotask(() => this.syncSize());
      return;
    }

    this.loadWorkspace();
    this.refreshDragSources();
    queueMicrotask(() => this.syncSize());
  }

  openRoute(route: string): void {
    if (this.isPopoutWindow) {
      return;
    }

    const normalizedRoute = this.normalizeRoute(route);

    if (normalizedRoute === '/app') {
      this.activeRoute = normalizedRoute;
      return;
    }

    this.activeRoute = normalizedRoute;

    if (!this.workspaceLoaded) {
      return;
    }

    this.addPanelToLayout(this.routeToPanel(normalizedRoute));
  }

  openPanel(panel: WorkspacePanelDescriptor): void {
    if (this.isPopoutWindow) {
      return;
    }

    const normalizedRoute = this.normalizeRoute(panel.state.route);
    this.activeRoute = normalizedRoute;
    const normalizedPanel = {
      ...panel,
      state: {
        ...panel.state,
        route: normalizedRoute
      }
    };

    if (!this.workspaceLoaded) {
      return;
    }

    this.addPanelToLayout(normalizedPanel);
  }

  registerDragSource(element: HTMLElement, panel: WorkspacePanelDescriptor): void {
    if (this.isPopoutWindow) {
      return;
    }

    this.dragSourceConfigs.set(element, () => this.createPanelConfig(panel));
    this.attachDragSource(element);
  }

  registerRouteDragSource(element: HTMLElement, route: string): void {
    const normalizedRoute = this.normalizeRoute(route);

    if (normalizedRoute === '/app') {
      return;
    }

    this.registerDragSource(element, this.routeToPanel(normalizedRoute));
  }

  unregisterDragSource(element: HTMLElement): void {
    const source = this.dragSources.get(element);

    if (source && this.layout) {
      this.layout.removeDragSource(source);
    }

    this.dragSources.delete(element);
    this.dragSourceConfigs.delete(element);
  }

  clearDragSources(): void {
    this.detachDragSources();
    this.dragSourceConfigs.clear();
  }

  private detachDragSources(): void {
    if (this.layout) {
      for (const source of this.dragSources.values()) {
        this.layout.removeDragSource(source);
      }
    }

    this.dragSources.clear();
  }

  private attachDragSource(element: HTMLElement): void {
    if (!this.layout) {
      return;
    }

    const config = this.dragSourceConfigs.get(element);

    if (!config || this.dragSources.has(element)) {
      return;
    }

    this.dragSources.set(element, this.layout.newDragSource(element, config));
  }

  private refreshDragSources(): void {
    if (!this.layout) {
      return;
    }

    this.detachDragSources();

    for (const element of this.dragSourceConfigs.keys()) {
      this.attachDragSource(element);
    }
  }

  resetLayout(): void {
    this.error.set(null);
    this.selectedWorkspaceId.set(null);
    this.openPanels.clear();
    this.loadDefaultWorkspaceLayout();
    this.syncSize();
  }

  saveCurrentWorkspace(): void {
    const workspaceName = this.promptWorkspaceName(this.currentWorkspaceName());

    if (!workspaceName) {
      return;
    }

    this.saveWorkspace(workspaceName).pipe(take(1)).subscribe();
  }

  restoreSavedWorkspace(): void {
    this.restoreWorkspace(this.selectedWorkspaceId());
  }

  restoreWorkspace(workspaceId?: string | null): void {
    if (!this.layout) {
      return;
    }

    this.loading.set(true);
    this.error.set(null);

    this.preferences
      .getPreferences(true)
      .pipe(
        take(1),
        tap((preferences) => {
          this.workspaces.set(preferences);
          const selected = workspaceId
            ? preferences.find((preference) => this.workspaceKey(preference) === workspaceId)
            : this.pickDefaultWorkspace(preferences) ?? preferences[0];

          if (selected && isLayoutConfig(selected.layoutJson)) {
            this.applyWorkspacePreference(selected);
            this.selectedWorkspaceId.set(this.workspaceKey(selected));
          } else {
            this.error.set('No saved workspace preference found.');
          }

          this.syncSize();
        }),
        catchError(() => {
          this.error.set('Workspace preferences could not be restored.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();
  }

  deleteWorkspace(workspaceId = this.selectedWorkspaceId()): void {
    if (!workspaceId) {
      return;
    }

    const target = this.workspaces().find((workspace) => this.workspaceKey(workspace) === workspaceId);

    if (!target || !this.confirmDeleteWorkspace(target.name ?? 'Workspace')) {
      return;
    }

    this.error.set('Workspace delete is not supported by the current preferences API.');
  }

  destroy(): void {
    this.detachDragSources();

    this.layout?.off('stateChanged', this.onLayoutStateChanged);
    this.layout?.destroy();
    this.layout = undefined;
    this.isPopoutWindow = false;
    this.setPopoutBodyClass(false);

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

    if (this.shouldLoadDefaultWorkspace()) {
      this.loadDefaultWorkspaceLayout();
      return;
    }

    const panels = Array.from(this.openPanels.values());

    this.beginProgrammaticLayoutChange();
    try {
      this.layout.loadLayout(this.createLayoutConfig({
        type: 'row',
        content: panels.map((panel) => this.createPanelConfig(panel))
      }));
    } finally {
      this.loadingRemoteLayout = false;
    }
  }

  private addPanelToLayout(panel: WorkspacePanelDescriptor): void {
    if (!this.layout || this.openPanels.has(panel.state.route)) {
      return;
    }

    this.openPanels.set(panel.state.route, panel);
    this.applyQuarterSizeLimits();

    if (this.openPanels.size > MAX_VISIBLE_WORKSPACE_PANELS) {
      this.layout.addItemAtLocation(this.createPanelConfig(panel), [
        { typeId: LayoutManager.LocationSelector.TypeId.FocusedStack },
        { typeId: LayoutManager.LocationSelector.TypeId.FirstStack },
        { typeId: LayoutManager.LocationSelector.TypeId.Root }
      ]);
    } else {
      this.layout.addItem(this.createPanelConfig(panel));
    }

    this.syncSize();
  }

  private loadDefaultWorkspaceLayout(): void {
    if (!this.layout) {
      return;
    }

    this.openPanels.clear();
    for (const panel of DEFAULT_WORKSPACE_PANELS) {
      this.openPanels.set(panel.state.route, panel);
    }

    this.beginProgrammaticLayoutChange();
    try {
      this.layout.clear();
      this.layout.loadLayout(this.createLayoutConfig({
        type: 'row',
        content: [
          {
            ...this.createPanelConfig(DEFAULT_WORKSPACE_PANELS[0]),
            size: '50%',
          },
          {
            type: 'column',
            size: '50%',
            content: [
              {
                ...this.createPanelConfig(DEFAULT_WORKSPACE_PANELS[1]),
                size: '50%',
              },
              {
                type: 'row',
                size: '50%',
                content: [
                  {
                    ...this.createPanelConfig(DEFAULT_WORKSPACE_PANELS[2]),
                    size: '50%',
                  },
                  {
                    ...this.createPanelConfig(DEFAULT_WORKSPACE_PANELS[3]),
                    size: '50%',
                  }
                ]
              }
            ]
          }
        ]
      }));
      queueMicrotask(() => this.syncSize());
    } finally {
      this.loadingRemoteLayout = false;
    }
  }

  private createLayoutConfig(root: NonNullable<LayoutConfig['root']>): LayoutConfig {
    const minSize = this.getQuarterMinSize();

    return {
      root,
      settings: {
        reorderEnabled: true,
        popoutWholeStack: false,
        constrainDragToContainer: true,
        blockedPopoutsThrowError: false,
        closePopoutsOnUnload: true,
        showMaximiseIcon: false,
        tabOverlapAllowance: 0,
        reorderOnTabMenuClick: true,
        popInOnClose: true
      },
      dimensions: {
        borderWidth: 8,
        borderGrabWidth: 10,
        headerHeight: 26,
        defaultMinItemHeight: `${minSize.height}px`,
        defaultMinItemWidth: `${minSize.width}px`,
        dragProxyWidth: 360,
        dragProxyHeight: 240
      },
      header: {
        show: 'top',
        popout: 'Open in window',
        popin: 'Dock panel',
        maximise: false,
        close: 'Close',
        minimise: 'Minimise',
        tabDropdown: 'More tabs'
      }
    };
  }

  private shouldLoadDefaultWorkspace(): boolean {
    if (this.openPanels.size === 0) {
      return true;
    }

    const panels = Array.from(this.openPanels.values());
    return panels.length === 1 && panels[0].state.route === '/app';
  }

  private loadSavedLayout(layoutConfig: LayoutConfig): void {
    if (!this.layout) {
      return;
    }

    const config = LayoutConfig.isResolved(layoutConfig)
      ? LayoutConfig.fromResolved(layoutConfig)
      : layoutConfig;
    const sanitizedConfig = this.sanitizeLayoutConfig(config);

    this.beginProgrammaticLayoutChange();
    this.suppressNextSave = true;
    try {
      this.layout.loadLayout(sanitizedConfig);
    } finally {
      this.loadingRemoteLayout = false;
    }
    this.rebuildOpenPanelsFromLayout();
  }

  private loadWorkspace(): void {
    this.loading.set(true);
    this.error.set(null);
    this.workspaceLoaded = true;
    this.loadCurrentLayout();
    this.syncSize();

    const preferences$ = this.preferences.getPreferences();

    preferences$
      .pipe(
        take(1),
        timeout({ first: 1500, with: () => of<WorkspacePreferences[] | null>(null) }),
        tap((preferences) => {
          if (!preferences) {
            return;
          }

          this.workspaces.set(preferences);
          const selected = this.pickDefaultWorkspace(preferences) ?? preferences[0];

          this.selectedWorkspaceId.set(selected ? this.workspaceKey(selected) : null);
          this.languageId = selected?.languageId || this.languageId;
          this.theme = selected?.theme || this.theme;

          if (selected && isLayoutConfig(selected.layoutJson)) {
            this.loadSavedLayout(selected.layoutJson);
          }

          this.syncSize();
        }),
        catchError(() => {
          this.error.set('Workspace preferences could not be loaded.');
          return EMPTY;
        }),
        finalize(() => this.loading.set(false))
      )
      .subscribe();

    preferences$
      .pipe(
        take(1),
        tap((preferences) => {
          this.workspaces.set(preferences);
        }),
        catchError(() => EMPTY)
      )
      .subscribe();
  }

  private readonly onLayoutStateChanged = (): void => {
    if (this.loadingRemoteLayout || Date.now() < this.ignoreLayoutChangesUntil) {
      return;
    }

    if (this.suppressNextSave) {
      this.suppressNextSave = false;
      return;
    }

    this.rebuildOpenPanelsFromLayout();
  };

  private beginProgrammaticLayoutChange(): void {
    this.loadingRemoteLayout = true;
    this.ignoreLayoutChangesUntil = Date.now() + 750;
  }

  private saveWorkspace(workspaceName: string) {
    if (!this.layout) {
      return EMPTY;
    }

    this.saving.set(true);

    return this.referenceData
      .getLanguageId()
      .pipe(
        take(1),
        switchMap((languageId) => {
          if (!languageId) {
            this.error.set('Workspace language could not be loaded.');
            return EMPTY;
          }

          this.languageId = languageId;

          const existingWorkspace = this.workspaces().find(
            (workspace) => workspace.name?.trim().toLowerCase() === workspaceName.toLowerCase()
          );
          const savedWorkspace: SaveWorkspacePreferences = {
            id: existingWorkspace?.id,
            name: workspaceName,
            theme: this.theme,
            languageId,
            layoutJson: this.layout ? LayoutConfig.fromResolved(this.layout.saveLayout()) : null
          };

          return this.preferences.savePreferences(savedWorkspace).pipe(
            switchMap(() => this.preferences.getPreferences(true))
          );
        }),
        tap((preferences) => {
          this.workspaces.set(preferences);
          const selectedWorkspace =
            preferences.find((workspace) => workspace.name?.trim().toLowerCase() === workspaceName.toLowerCase()) ??
            this.pickDefaultWorkspace(preferences) ??
            preferences[0];

          this.selectedWorkspaceId.set(selectedWorkspace ? this.workspaceKey(selectedWorkspace) : null);
          this.languageId = selectedWorkspace?.languageId || this.languageId;
          this.theme = selectedWorkspace?.theme || this.theme;
          this.error.set(null);
        }),
        catchError(() => {
          this.error.set('Workspace preferences could not be saved.');
          return EMPTY;
        }),
        finalize(() => this.saving.set(false))
      );
  }

  private pickDefaultWorkspace(workspaces: WorkspacePreferences[]): WorkspacePreferences | undefined {
    return workspaces.find((workspace) => workspace.isDefault);
  }

  private currentWorkspaceName(): string {
    return this.currentWorkspace()?.name ?? 'Workspace';
  }

  private currentWorkspace(): WorkspacePreferences | undefined {
    const selectedKey = this.selectedWorkspaceId();

    return (
      this.workspaces().find((workspace) => selectedKey && this.workspaceKey(workspace) === selectedKey) ??
      this.pickDefaultWorkspace(this.workspaces()) ??
      this.workspaces()[0]
    );
  }

  private promptWorkspaceName(defaultName: string): string | null {
    const name = typeof window === 'undefined' ? defaultName : window.prompt('Workspace name', defaultName);
    const trimmed = name?.trim();

    if (name === null) {
      return null;
    }

    if (!trimmed) {
      this.error.set('Workspace name is required.');
      return null;
    }

    return trimmed.slice(0, 80);
  }

  private workspaceKey(workspace: WorkspacePreferences): string | null {
    return workspace.id ?? workspace.name ?? null;
  }

  private applyWorkspacePreference(preference: WorkspacePreferences): void {
    this.languageId = preference.languageId || this.languageId;
    this.theme = preference.theme || this.theme;

    if (isLayoutConfig(preference.layoutJson)) {
      this.loadSavedLayout(preference.layoutJson);
    }
  }

  private confirmDeleteWorkspace(name: string): boolean {
    return typeof window === 'undefined' || window.confirm(`Delete workspace "${name}"?`);
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

    const width = this.hostElement.offsetWidth;
    const height = this.hostElement.offsetHeight;

    if (width > 0 && height > 0) {
      this.applyQuarterSizeLimits(width, height);
      const minSize = this.getQuarterMinSize(width, height);
      this.layout.setSize(Math.max(width, minSize.width * 2), Math.max(height, minSize.height * 2));
    }
  }

  private applyQuarterSizeLimits(width = this.hostElement?.offsetWidth ?? 0, height = this.hostElement?.offsetHeight ?? 0): void {
    if (!this.layout || width <= 0 || height <= 0) {
      return;
    }

    const minSize = this.getQuarterMinSize(width, height);

    this.layout.layoutConfig = {
      ...this.layout.layoutConfig,
      dimensions: {
        ...this.layout.layoutConfig.dimensions,
        defaultMinItemWidth: minSize.width,
        defaultMinItemHeight: minSize.height
      }
    };
  }

  private getQuarterMinSize(width = this.hostElement?.offsetWidth ?? 0, height = this.hostElement?.offsetHeight ?? 0): { width: number; height: number } {
    return {
      width: Math.max(160, Math.floor(width / 2)),
      height: Math.max(120, Math.floor(height / 2))
    };
  }

  private sanitizeLayoutConfig(config: LayoutConfig): LayoutConfig {
    const next = structuredClone(config) as LayoutConfig;

    stripItemMinSize(next.root);

    return next;
  }

  private setPopoutBodyClass(enabled: boolean): void {
    if (typeof document === 'undefined') {
      return;
    }

    document.body.classList.toggle('gl-popout-window', enabled);
  }
}

function isWorkspacePanelType(value: string): value is WorkspacePanelType {
  return WORKSPACE_PANEL_TYPES.includes(value as WorkspacePanelType);
}

function isLayoutConfig(value: unknown): value is LayoutConfig {
  return !!value && typeof value === 'object' && 'root' in value;
}

function createWorkspacePanel(type: WorkspacePanelType, title: string, route: string): WorkspacePanelDescriptor {
  return {
    type,
    state: {
      title,
      route
    }
  };
}

function collectPanels(item: unknown): WorkspacePanelDescriptor[] {
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

  return content.flatMap((child) => collectPanels(child));
}

function stripItemMinSize(item: unknown): void {
  if (!item || typeof item !== 'object') {
    return;
  }

  const itemRecord = item as Record<string, unknown>;
  delete itemRecord['minSize'];
  delete itemRecord['minWidth'];
  delete itemRecord['minHeight'];

  const content = itemRecord['content'];

  if (Array.isArray(content)) {
    for (const child of content) {
      stripItemMinSize(child);
    }
  }
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

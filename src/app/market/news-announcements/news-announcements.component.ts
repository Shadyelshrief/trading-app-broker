import { AsyncPipe, DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { WorkspaceLayoutService } from '../../core/layout/workspace/workspace-layout.service';
import { MarketGridComponent } from '../../shared/components/market-grid/market-grid.component';
import { MarketGridContextAction } from '../../shared/models/market-grid.model';
import {
  displayNewsSymbol,
  normalizeNewsMarket
} from './news-announcements.filters';
import { hasSymbol } from './news-announcements.mapper';
import { NewsAnnouncementsFacade } from './news-announcements.facade';
import {
  NewsAnnouncementRow,
  NewsAnnouncementsMarketFilter,
  SymbolOption
} from './news-announcements.models';

@Component({
  selector: 'app-news-announcements',
  standalone: true,
  imports: [
    AsyncPipe,
    DatePipe,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MarketGridComponent
  ],
  templateUrl: './news-announcements.component.html',
  styleUrl: './news-announcements.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [NewsAnnouncementsFacade]
})
export class NewsAnnouncementsComponent {
  readonly state = input<{ title: string; route: string; section?: string; screen?: string; context?: Record<string, unknown> }>();

  protected readonly facade = inject(NewsAnnouncementsFacade);
  protected readonly workspace = inject(WorkspaceLayoutService);
  protected readonly vm$ = this.facade.vm$;
  protected readonly columns = this.facade.columns;
  protected readonly gridOptions = {
    getRowId: (params: { data: NewsAnnouncementRow }) => params.data.id
  };
  protected readonly showProductNewsControl = new FormControl(true, { nonNullable: true });
  protected readonly symbolControl = new FormControl<string | SymbolOption>('', { nonNullable: true });
  protected readonly showBrokerNewsControl = new FormControl(true, { nonNullable: true });
  protected readonly showMarketNewsControl = new FormControl(true, { nonNullable: true });
  protected readonly marketControl = new FormControl<NewsAnnouncementsMarketFilter>('all', {
    nonNullable: true
  });
  protected readonly fromDateControl = new FormControl<Date | null>(getDefaultFromDate());
  protected readonly toDateControl = new FormControl<Date | null>(new Date());
  protected readonly menuActions: MarketGridContextAction<NewsAnnouncementRow>[] = [
    { id: 'copy', label: 'Copy' },
    { id: 'export', label: 'Export To Excel' },
    { id: 'fit-ideal', label: 'Fit Columns To Ideal Size' },
    { id: 'fit-window', label: 'Fit Columns To Fit Window' },
    { id: 'print', label: 'Print' },
    { id: 'selection-type', label: 'Set Selection Type' },
    { id: 'quote', label: 'Price Quote', disabled: (row) => !hasSymbol(row as NewsAnnouncementRow) },
    { id: 'chart', label: 'Charting', disabled: (row) => !hasSymbol(row as NewsAnnouncementRow) },
    { id: 'depth-price', label: 'Market Depth By Price', disabled: (row) => !hasSymbol(row as NewsAnnouncementRow) },
    { id: 'depth-order', label: 'Market Depth By Order', disabled: (row) => !hasSymbol(row as NewsAnnouncementRow) },
    { id: 'time-sales', label: 'Time & Sales', disabled: (row) => !hasSymbol(row as NewsAnnouncementRow) }
  ];

  constructor() {
    this.showProductNewsControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((checked) => {
        this.toggleSymbolControl(checked);
        this.facade.toggleProductNews(checked);
      });

    this.symbolControl.valueChanges
      .pipe(debounceTime(120), takeUntilDestroyed())
      .subscribe((value) => {
        if (typeof value === 'string') {
          this.facade.updateSymbolQuery(value);

          if (!value.trim()) {
            this.facade.selectSymbol(null);
          }

          return;
        }

        this.facade.selectSymbol(value);
      });

    this.showBrokerNewsControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((checked) => this.facade.toggleBrokerNews(checked));

    this.showMarketNewsControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((checked) => {
        this.toggleMarketControl(checked);
        this.facade.toggleMarketNews(checked);
      });

    this.marketControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((market) => this.facade.selectMarket(normalizeNewsMarket(market)));

    this.fromDateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((date) => this.facade.updateFromDate(formatDateForApi(date)));

    this.toDateControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((date) => this.facade.updateToDate(formatDateForApi(date)));
  }

  protected readonly displaySymbol = displayNewsSymbol;

  protected openNewsDetail(row: NewsAnnouncementRow): void {
    this.workspace.openPanel({
      type: 'placeholder',
      state: {
        title: row.symbolId ? `News Detail - ${row.symbolId}` : 'News Detail',
        route: `/app/pricing/news-announcements/${row.id}`,
        section: 'pricing',
        screen: 'news-announcements',
        context: {
          news: row
        }
      }
    });
  }

  captureState() {
    return this.state();
  }

  private toggleSymbolControl(enabled: boolean): void {
    if (enabled) {
      this.symbolControl.enable({ emitEvent: false });
      return;
    }

    this.symbolControl.disable({ emitEvent: false });
  }

  private toggleMarketControl(enabled: boolean): void {
    if (enabled) {
      this.marketControl.enable({ emitEvent: false });
      return;
    }

    this.marketControl.disable({ emitEvent: false });
  }
}

function getDefaultFromDate(): Date {
  const date = new Date();
  date.setDate(1);
  return date;
}

function formatDateForApi(value: Date | null): string {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return '';
  }

  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

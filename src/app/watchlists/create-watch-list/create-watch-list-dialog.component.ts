import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { catchError, debounceTime, of, switchMap } from 'rxjs';

import { formatClientDisplay } from '../../shared/utils/client-display.util';
import {
  ClientOption,
  PortfolioOption,
  SymbolOption,
  WatchListCondition,
  WatchListConfig,
  WatchListSourceType
} from '../saved-watch-list/saved-watch-list.models';
import { CreateWatchListFacade } from './create-watch-list.facade';
import {
  WatchListDialogData,
  WatchListDialogResult
} from './create-watch-list.models';
import { validateWatchListConfig } from './create-watch-list.validators';

@Component({
  selector: 'app-create-watch-list-dialog',
  standalone: true,
  imports: [
    AsyncPipe,
    FormsModule,
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatListModule,
    MatSelectModule,
    MatTabsModule
  ],
  templateUrl: './create-watch-list-dialog.component.html',
  styleUrl: './create-watch-list-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [CreateWatchListFacade]
})
export class CreateWatchListDialogComponent {
  private readonly data = inject<WatchListDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<CreateWatchListDialogComponent, WatchListDialogResult>>(MatDialogRef);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly facade = inject(CreateWatchListFacade);
  protected readonly mode = this.data.mode;
  protected readonly title = this.mode === 'edit' ? 'Edit Watch List' : 'Create New Watch List';
  protected readonly error = signal<string | null>(null);
  protected readonly nameControl = new FormControl(this.data.config?.name ?? '', { nonNullable: true });
  protected readonly sourceControl = new FormControl<WatchListSourceType>(this.data.config?.sourceType ?? 'ALL_SYMBOLS', {
    nonNullable: true
  });
  protected readonly marketControl = new FormControl(this.data.config?.filters?.market ?? 'all', { nonNullable: true });
  protected readonly sectorControl = new FormControl(this.data.config?.filters?.sector ?? 'all', { nonNullable: true });
  protected readonly indexControl = new FormControl(this.data.config?.filters?.index ?? 'All Indexes', { nonNullable: true });
  protected readonly sessionControl = new FormControl(this.data.config?.filters?.tradingSession ?? 'All Sessions', {
    nonNullable: true
  });
  protected readonly clientControl = new FormControl<string | ClientOption>(this.data.config?.filters?.client ?? '', { nonNullable: true });
  protected readonly portfolioControl = new FormControl(this.data.config?.filters?.portfolio?.portfolioId ?? '', {
    nonNullable: true
  });
  protected readonly clientOptions = signal<readonly ClientOption[]>([]);
  protected readonly portfolioOptions = signal<readonly PortfolioOption[]>([]);
  protected readonly availableSelection = signal<readonly string[]>([]);
  protected readonly watchedSelection = signal<readonly string[]>([]);
  protected readonly watchedSymbols = signal<SymbolOption[]>(this.data.config?.selectedSymbols ?? []);
  protected readonly conditions = signal<WatchListCondition[]>(this.data.config?.conditions ?? []);
  private readonly filterVersion = signal(0);
  protected readonly sectors = computed(() => {
    this.filterVersion();
    return this.facade.getSectors(this.marketControl.value);
  });
  protected readonly availableSymbols = computed(() => {
    this.filterVersion();
    const watchedKeys = new Set(this.watchedSymbols().map((symbol) => symbolKey(symbol)));

    return this.facade
      .filterSymbols(this.marketControl.value, this.sectorControl.value)
      .filter((symbol) => !watchedKeys.has(symbolKey(symbol)));
  });

  constructor() {
    this.marketControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.sectorControl.setValue('all');
      this.filterVersion.update((version) => version + 1);
    });

    this.sectorControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => {
      this.filterVersion.update((version) => version + 1);
    });

    this.clientControl.valueChanges
      .pipe(
        debounceTime(220),
        switchMap((value) => (typeof value === 'string' ? this.facade.searchClients(value).pipe(catchError(() => of([]))) : of([]))),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((clients) => this.clientOptions.set(clients));

    const initialClient = this.data.config?.filters?.client;
    if (initialClient) {
      this.loadPortfolios(initialClient.clientId);
    }
  }

  protected displayClient(value: string | ClientOption | null): string {
    return formatClientDisplay(value);
  }

  protected selectClient(client: ClientOption): void {
    this.clientControl.setValue(client, { emitEvent: false });
    this.portfolioControl.setValue('');
    this.loadPortfolios(client.clientId);
  }

  protected clear(): void {
    this.nameControl.setValue('');
    this.sourceControl.setValue('ALL_SYMBOLS');
    this.marketControl.setValue('all');
    this.sectorControl.setValue('all');
    this.indexControl.setValue('All Indexes');
    this.sessionControl.setValue('All Sessions');
    this.clientControl.setValue('');
    this.portfolioControl.setValue('');
    this.clientOptions.set([]);
    this.portfolioOptions.set([]);
    this.availableSelection.set([]);
    this.watchedSelection.set([]);
    this.watchedSymbols.set([]);
    this.conditions.set([]);
    this.error.set(null);
  }

  protected save(): void {
    const now = Date.now();
    const selectedClient = typeof this.clientControl.value === 'string' ? null : this.clientControl.value;
    const selectedPortfolio =
      this.portfolioOptions().find((portfolio) => portfolio.portfolioId === this.portfolioControl.value) ?? null;
    const config: WatchListConfig = {
      id: this.data.config?.id ?? crypto.randomUUID(),
      name: this.nameControl.value,
      sourceType: this.sourceControl.value,
      filters: {
        market: this.marketControl.value,
        sector: this.sectorControl.value,
        index: this.indexControl.value,
        tradingSession: this.sessionControl.value,
        client: selectedClient,
        portfolio: selectedPortfolio
      },
      selectedSymbols: this.watchedSymbols(),
      conditions: this.conditions(),
      createdAt: this.data.config?.createdAt ?? now,
      updatedAt: this.data.config ? now : now
    };
    const validationError = validateWatchListConfig(config);

    if (validationError) {
      this.error.set(validationError);
      return;
    }

    this.facade.save(config).subscribe({
      next: (saved) => this.dialogRef.close({ action: 'saved', configId: saved.id }),
      error: (error) => this.error.set(error instanceof Error ? error.message : 'Unable to save watch list.')
    });
  }

  protected delete(): void {
    const config = this.data.config;

    if (!config || !confirm(`Delete watch list "${config.name}"?`)) {
      return;
    }

    this.facade.delete(config.id).subscribe({
      next: () => this.dialogRef.close({ action: 'deleted', configId: config.id }),
      error: (error) => this.error.set(error instanceof Error ? error.message : 'Unable to delete watch list.')
    });
  }

  protected addExpression(): void {
    this.conditions.update((conditions) => [
      ...conditions,
      {
        join: conditions.length === 0 ? undefined : 'AND',
        field: 'bidPrice',
        operator: '>=',
        value: 0
      }
    ]);
  }

  protected removeExpression(index: number): void {
    this.conditions.update((conditions) => conditions.filter((_, conditionIndex) => conditionIndex !== index));
  }

  protected updateCondition(index: number, patch: Partial<WatchListCondition>): void {
    this.conditions.update((conditions) =>
      conditions.map((condition, conditionIndex) =>
        conditionIndex === index ? { ...condition, ...patch } : condition
      )
    );
  }

  protected moveSelectedToWatched(): void {
    const selected = new Set(this.availableSelection());
    const additions = this.availableSymbols().filter((symbol) => selected.has(symbolKey(symbol)));
    this.watchedSymbols.update((symbols) => dedupeSymbols([...symbols, ...additions]));
    this.availableSelection.set([]);
  }

  protected moveAllToWatched(): void {
    this.watchedSymbols.update((symbols) => dedupeSymbols([...symbols, ...this.availableSymbols()]));
    this.availableSelection.set([]);
  }

  protected removeSelectedFromWatched(): void {
    const selected = new Set(this.watchedSelection());
    this.watchedSymbols.update((symbols) => symbols.filter((symbol) => !selected.has(symbolKey(symbol))));
    this.watchedSelection.set([]);
  }

  protected removeAllFromWatched(): void {
    this.watchedSymbols.set([]);
    this.watchedSelection.set([]);
  }

  protected updateAvailableSelection(values: readonly string[]): void {
    this.availableSelection.set(values);
  }

  protected updateWatchedSelection(values: readonly string[]): void {
    this.watchedSelection.set(values);
  }

  protected symbolKey(symbol: SymbolOption): string {
    return symbolKey(symbol);
  }

  private loadPortfolios(clientId: string): void {
    this.facade
      .getClientPortfolios(clientId)
      .pipe(catchError(() => of([])), takeUntilDestroyed(this.destroyRef))
      .subscribe((portfolios) => this.portfolioOptions.set(portfolios));
  }
}

function symbolKey(symbol: SymbolOption): string {
  return `${symbol.marketShortName}:${symbol.symbolId}`;
}

function dedupeSymbols(symbols: readonly SymbolOption[]): SymbolOption[] {
  const seen = new Set<string>();
  const result: SymbolOption[] = [];

  for (const symbol of symbols) {
    const key = symbolKey(symbol);

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(symbol);
  }

  return result;
}

import { Component, computed, DestroyRef, effect, inject, input, OnInit, signal, Signal, untracked, WritableSignal } from '@angular/core';
import { first } from 'rxjs';

import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemDataContributor } from '@Ordering/shared/models/item-data-contributor.interface';
import { AdminDataEntry } from '@Ordering/api';
import { SlotListComponent } from '@Ordering/shared/components/slot-list/slot-list.component';
import { SlotListConfig } from '@Ordering/shared/components/slot-list/slot-list-action.model';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';

import { SignalsSlotService } from './services/signals-slot.service';

/**
 * Smart slot component for the signals list.
 * Implements ItemDataContributor<AdminDataEntry[]> and registers with FormAggregatorService.
 * Delegates all display logic to <app-slot-list> and all dialog/config logic to SignalsSlotService.
 * Each row/slot action has its own dedicated handler method.
 */
@Component({
  selector: 'app-signals-slot',
  standalone: true,
  imports: [SlotListComponent],
  providers: [SignalsSlotService],
  templateUrl: './signals-slot.component.html',
})
export class SignalsSlotComponent implements ItemDataContributor<AdminDataEntry[]>, OnInit {
  // ─── Standard slot inputs (set by OrderItemHostComponent) ─────────────────
  readonly displayMode = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  readonly initialData = input<AdminDataEntry[]>([]);
  /** Accepted from the host via resolvedInputs — the actual key is always ContributorKey.SIGNALS. */
  // eslint-disable-next-line @angular-eslint/no-input-rename
  readonly _hostContributorKey = input<string>('', { alias: 'contributorKey' });

  // ─── ItemDataContributor ─────────────────────────────────────────────
  readonly contributorKey = ContributorKey.SIGNALS;
  readonly data: Signal<AdminDataEntry[]> = computed(() => this._currentItems());
  readonly isValid: Signal<boolean> = signal(true);
  readonly isDirty: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return false;
    return JSON.stringify(this._currentItems()) !== this._lastAppliedSnapshot();
  });

  // ─── Internal state ──────────────────────────────────────────────────────
  private readonly _currentItems: WritableSignal<AdminDataEntry[]> = signal([]);
  private readonly _lastAppliedSnapshot: WritableSignal<string> = signal('[]');

  // ─── Services ──────────────────────────────────────────────────────────
  private readonly slotService = inject(SignalsSlotService);
  private readonly aggregator = inject(FormAggregatorService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  // ─── Slot list config ───────────────────────────────────────────────────
  protected readonly isEditMode = computed(() => this.displayMode() === SlotDisplayMode.EDITABLE);
  protected readonly sectionLabel = this.slotService.sectionLabel;

  /**
   * Single config object passed to <app-slot-list>.
   * Row and slot actions wire each button directly to a dedicated handler method.
   */
  protected readonly slotConfig = computed(
    (): SlotListConfig<AdminDataEntry> => ({
      columns: this.slotService.getColumns(),
      rowActions: this.isEditMode()
        ? [
            { icon: 'edit', tooltipKey: this.slotService.editTooltip, handler: item => this.onEditSignal(item) },
            { icon: 'clear', tooltipKey: this.slotService.deleteTooltip, handler: item => this.onDeleteSignal(item) },
          ]
        : [],
      slotActions: this.isEditMode()
        ? [
            { labelKey: this.slotService.addLabel, handler: () => this.onAddSignal() },
            { labelKey: this.slotService.importLabel, handler: () => this.onImportSignal() },
          ]
        : [],
      noDataMessage: this.slotService.noDataMessage,
    }),
  );

  constructor() {
    effect(() => {
      const initial = this.initialData() ?? [];
      const newSnapshot = JSON.stringify(initial);
      if (newSnapshot === untracked(() => this._lastAppliedSnapshot())) return;
      this._currentItems.set([...initial]);
      this._lastAppliedSnapshot.set(newSnapshot);
    });
  }

  ngOnInit(): void {
    if (this.aggregator) {
      this.aggregator.register(this);
      this.destroyRef.onDestroy(() => this.aggregator!.unregister(this.contributorKey));
    }
  }

  public markAsPristine(): void {
    this._lastAppliedSnapshot.set(JSON.stringify(this._currentItems()));
  }

  /**
   * Replaces the edited row in-place with the result from the edit dialog.
   * @param {AdminDataEntry} item The item to be edited.
   * @returns {void}
   */
  private onEditSignal(item: AdminDataEntry): void {
    this.slotService
      .openEditDialog(item)
      .pipe(first())
      .subscribe(result => {
        if (!result) return;
        this._currentItems.update(items => items.map(i => (i === item ? result : i)));
        this.aggregator?.notifyStateChange();
      });
  }

  /** Removes the row immediately — no dialog.
   * @param {AdminDataEntry} item The item to be removed.
   * @returns {void}
   */
  private onDeleteSignal(item: AdminDataEntry): void {
    this._currentItems.update(items => items.filter(i => i !== item));
    this.aggregator?.notifyStateChange();
  }

  /**
   * Opens the multi-select dialog and appends the chosen signals.
   * @returns {void}
   */
  private onAddSignal(): void {
    this.slotService
      .openAddDialog()
      .pipe(first())
      .subscribe(newItems => {
        this.updateSignalsList(newItems);
      });
  }

  /**
   * Opens the CSV import dialog and appends the accepted signals.
   * @returns {void}
   */
  private onImportSignal(): void {
    this.slotService
      .openImportDialog()
      .pipe(first())
      .subscribe(newItems => {
        this.updateSignalsList(newItems);
      });
  }

  /**
   * Updates the current signals list with the new items.
   * @param {AdminDataEntry[]} newItems The new items to be added.
   * @returns {void}
   */
  private updateSignalsList(newItems: AdminDataEntry[]): void {
    if (!newItems.length) return;
    this._currentItems.update(items => [...items, ...newItems]);
    this.aggregator?.notifyStateChange();
  }
}

import { Component, computed, DestroyRef, effect, inject, input, OnInit, signal, Signal, WritableSignal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';

import { RestrictionTimeSlots } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ItemDataContributor } from '@Ordering/shared/models/item-data-contributor.interface';
import { SlotListComponent } from '@Ordering/shared/components/slot-list/slot-list.component';
import { SlotListConfig } from '@Ordering/shared/components/slot-list/slot-list-action.model';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';

import { AddTimeSlotDialogComponent } from './dialogs/add-time-slot-dialog/add-time-slot-dialog.component';

/**
 * Table row model for rendered time slots.
 */
interface TimeSlotRow {
  index: number;
  dateRange: string;
  timeFrame: string;
  separated: string;
}

@Component({
  selector: 'app-time-slots-slot',
  standalone: true,
  imports: [SlotListComponent],
  templateUrl: './time-slots-slot.component.html',
  styleUrl: './time-slots-slot.component.scss',
})
/**
 * Restriction time-slot contributor rendered inside the restriction flow.
 */
export class TimeSlotsSlotComponent implements ItemDataContributor<RestrictionTimeSlots[]>, OnInit {
  readonly displayMode = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  readonly initialData = input<RestrictionTimeSlots[]>([]);

  readonly contributorKey = ContributorKey.TIME_SLOTS;
  readonly data: Signal<RestrictionTimeSlots[]> = computed(() => this._currentItems());
  readonly isValid: Signal<boolean> = signal(true);
  readonly isDirty: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) {
      return false;
    }
    return JSON.stringify(this._currentItems()) !== this._lastAppliedSnapshot();
  });

  private readonly tr = inject(TranslationsService);
  private readonly dialog = inject(MatDialog);
  private readonly aggregator = inject(FormAggregatorService, { optional: true });
  private readonly destroyRef = inject(DestroyRef);

  private readonly _currentItems: WritableSignal<RestrictionTimeSlots[]> = signal([]);
  private readonly _lastAppliedSnapshot: WritableSignal<string> = signal('[]');

  protected readonly sectionLabel = this.tr.translate('lblTimeSlots');
  protected readonly rows = computed<TimeSlotRow[]>(() =>
    this.data().map((slot, index) => ({
      index,
      dateRange: `${slot.beginDate} – ${slot.endDate}`,
      timeFrame: `${slot.fromTime} – ${slot.toTime}`,
      separated: slot.broken ? this.tr.translate('lblSeparatedYes') : this.tr.translate('lblSeparatedNo'),
    })),
  );

  protected readonly slotConfig = computed(
    (): SlotListConfig<TimeSlotRow> => ({
      columns: [
        { field: 'dateRange', colHeader: this.tr.translate('lblDateRange'), sortable: true },
        { field: 'timeFrame', colHeader: this.tr.translate('lblTimeFrame'), sortable: true },
        { field: 'separated', colHeader: this.tr.translate('lblSeparated'), sortable: false },
      ],
      rowActions:
        this.displayMode() === SlotDisplayMode.EDITABLE
          ? [
              {
                icon: 'edit',
                tooltipKey: this.tr.translate('lblEdit'),
                handler: row => this.onEditTimeSlot(row.index),
              },
              {
                icon: 'delete',
                tooltipKey: this.tr.translate('lblDelete'),
                handler: row => this.onDeleteTimeSlot(row.index),
              },
            ]
          : [],
      slotActions:
        this.displayMode() === SlotDisplayMode.EDITABLE
          ? [{ labelKey: this.tr.translate('lblAddTimeslot'), handler: () => this.onAddTimeSlot() }]
          : [],
      noDataMessage: this.tr.translate('lblNoTimeSlots'),
    }),
  );

  constructor() {
    effect(() => {
      const initial = this.initialData();
      const snapshot = JSON.stringify(initial ?? []);
      if (snapshot === this._lastAppliedSnapshot()) {
        return;
      }
      this._currentItems.set([...(initial ?? [])]);
      this._lastAppliedSnapshot.set(snapshot);
    });
  }

  /**
   * Registers the contributor with the parent aggregator.
   */
  ngOnInit(): void {
    if (this.aggregator) {
      this.aggregator.register(this);
      this.destroyRef.onDestroy(() => this.aggregator!.unregister(this.contributorKey));
    }
  }

  /**
   * Marks the current time-slot snapshot as pristine.
   */
  public markAsPristine(): void {
    this._lastAppliedSnapshot.set(JSON.stringify(this._currentItems()));
  }

  /**
   * Opens the dialog to append a new time slot.
   */
  private onAddTimeSlot(): void {
    this.dialog
      .open(AddTimeSlotDialogComponent, {
        width: '500px',
      })
      .afterClosed()
      .subscribe(newSlot => {
        if (!newSlot) {
          return;
        }
        this._currentItems.update(items => [...items, newSlot]);
        this.aggregator?.notifyStateChange();
      });
  }

  /**
   * Opens the dialog to edit an existing time slot.
   *
   * @param {number} index - Zero-based row index to edit.
   */
  private onEditTimeSlot(index: number): void {
    const current = this._currentItems();
    if (index < 0 || index >= current.length) {
      return;
    }

    this.dialog
      .open(AddTimeSlotDialogComponent, {
        width: '500px',
        data: { initialValue: current[index] },
      })
      .afterClosed()
      .subscribe(updatedSlot => {
        if (!updatedSlot) {
          return;
        }
        this._currentItems.update(items => items.map((item, i) => (i === index ? updatedSlot : item)));
        this.aggregator?.notifyStateChange();
      });
  }

  /**
   * Deletes the time slot at the given index.
   *
   * @param {number} index - Zero-based row index to remove.
   */
  private onDeleteTimeSlot(index: number): void {
    this._currentItems.update(items => items.filter((_, i) => i !== index));
    this.aggregator?.notifyStateChange();
  }
}

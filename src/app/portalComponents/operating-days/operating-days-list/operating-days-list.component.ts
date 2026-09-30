import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  InputSignal,
  signal,
  Signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';

import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';

import { first } from 'rxjs';
import dayjs from 'dayjs';

import { DaySet, OrderItemAction } from '@Ordering/api';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { DayNumbersToNamesPipe } from '@Ordering/core/pipes/day-numbers-to-names.pipe';
import { DialogAction } from '@Ordering/data/custom/enum/dialog-action.enum';
import { LocalConfigService } from '@Ordering/shared/services/local-config.service';
import { OperatingDaysDialogComponent } from '@Ordering/portalComponents/operating-days/operating-days-dialog/operating-days-dialog.component';
import { DaySetListItem, OperatingDaysDialogData } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { getEndDateFromBitmap } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { ConfirmationDialogComponent } from '@Ordering/shared/components/confirmation-dialog/confirmation-dialog.component';
import { SaveTemplateDialogComponent } from '@Ordering/portalComponents/operating-days/save-template/save-template-dialog/save-template-dialog.component';
import { PresavedTemplateService } from '@Ordering/portalComponents/operating-days/presaved-template/services/presaved-template.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { FormAggregatorService } from '@Ordering/shared/services/form-aggregator.service';
import { ItemDataContributor } from '@Ordering/shared/models/item-data-contributor.interface';
import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';

@Component({
  selector: 'app-operating-days-list',
  imports: [SharedMaterialModule, TranslatePipe, DayNumbersToNamesPipe],
  templateUrl: './operating-days-list.component.html',
  styleUrl: './operating-days-list.component.scss',
})
export class OperatingDaysListComponent implements AfterViewInit, ItemDataContributor<DaySet[]> {
  @ViewChild(MatPaginator) paginator: MatPaginator | undefined;

  // ─── ItemDataContributor ──────────────────────────────────────────────
  readonly contributorKey = ContributorKey.OPERATING_DAYS;
  public readonly displayMode: InputSignal<SlotDisplayMode> = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  public readonly initialData: InputSignal<DaySet[]> = input<DaySet[]>([]);
  private baselineSnapshot: WritableSignal<string> = signal('[]');

  public readonly data: Signal<DaySet[]> = computed(() =>
    this.opreatingDaysListSig().map((item: DaySetListItem) => ({
      beginDate: dayjs(item.beginDate).format(DateTimeFormat.API_DATE_FORMAT),
      daysBitmap: item.daysBitmap,
      selectedDays: item.selectedDays,
      deselectedDays: item.deselectedDays,
    })),
  );

  public readonly isValid: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return true;
    return this.data().length > 0;
  });

  public readonly isDirty: Signal<boolean> = computed(() => {
    if (this.displayMode() !== SlotDisplayMode.EDITABLE) return false;
    return JSON.stringify(this.data()) !== this.baselineSnapshot();
  });

  public markAsPristine(): void {
    this.baselineSnapshot.set(JSON.stringify(this.data()));
  }
  // ─────────────────────────────────────────────────────────────────────

  /** Original operating days for subset validation (replacement flow). */
  public readonly trainRunOriginalOperatingDays: InputSignal<DaySet[]> = input<DaySet[]>([]);

  /** Content type passed from host for dialog context. */
  public readonly contentType: InputSignal<OrderItemAction | undefined> = input<OrderItemAction | undefined>(undefined);

  /** Whether to show the paginator below the table. */
  public readonly showPaginator: InputSignal<boolean> = input<boolean>(true);

  /** Maximum number of operating days allowed (undefined = unlimited). */
  public readonly maxAllowedOperatingDays: InputSignal<number | undefined> = input<number | undefined>(undefined);

  protected isEditMode = computed(() => this.displayMode() === SlotDisplayMode.EDITABLE);

  private dialog = inject(MatDialog);
  private tr = inject(TranslationsService);
  private readonly presavedTemplateService = inject(PresavedTemplateService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly aggregator = inject(FormAggregatorService, { optional: true });

  public operatingDaysListColumns: string[] = ['fromDate', 'toDate', 'operatingDays', 'action'];

  protected paginatorPageSizes: number[] = LocalConfigService.paginatorPageSizes;

  protected opreatingDaysListSig = signal<DaySetListItem[]>([]);
  public operatingDaysListDataSource: MatTableDataSource<DaySetListItem> = new MatTableDataSource<DaySetListItem>();

  protected isAddingOperatingDaysAllowedSig = computed(() => {
    const max = this.maxAllowedOperatingDays();
    return max ? this.opreatingDaysListSig().length < max : true;
  });

  constructor() {
    // Register with aggregator if available (plugin mode)
    if (this.aggregator) {
      this.aggregator.register(this);
      this.destroyRef.onDestroy(() => this.aggregator!.unregister(this.contributorKey));
    }

    // Effect to update MatTableDataSource when signal changes
    effect(() => {
      this.operatingDaysListDataSource.data = [...this.opreatingDaysListSig()];
    });

    // Populate data whenever initialData changes
    effect(() => {
      const initial = this.initialData();
      if (initial && initial.length > 0) {
        this.opreatingDaysListSig.set(
          initial.map((operatingDay: DaySet, index: number) => this.prepareDaySetListItem(index, operatingDay)),
        );
        this.baselineSnapshot.set(JSON.stringify(initial));
      }
    });
  }

  public ngAfterViewInit(): void {
    if (this.showPaginator() && this.paginator) {
      this.operatingDaysListDataSource.paginator = this.paginator;
    }
  }

  /**
   * Prepares a DaySetListItem object from the given id and operatingDay.
   *
   * @param {number} id - The unique identifier for the DaySetListItem.
   * @param {DaySet} operatingDay - The DaySet object containing the operating day details.
   * @returns {DaySetListItem} A DaySetListItem object with formatted beginDate and other properties from the operatingDay.
   */
  private prepareDaySetListItem(id: number, operatingDay: DaySet): DaySetListItem {
    return {
      id,
      beginDate: operatingDay.beginDate, // Keep as original date string/object
      endDate: getEndDateFromBitmap(operatingDay.beginDate, operatingDay.daysBitmap),
      daysBitmap: operatingDay.daysBitmap,
      selectedDays: operatingDay.selectedDays,
      deselectedDays: operatingDay.deselectedDays,
    };
  }

  /**
   * Opens a dialog to add new operating days. When the dialog is closed and a result is returned,
   * it adds the new operating day to the existing list of operating days, assigns a new ID to it,
   * updates the data source, and emits the updated list of operating days.
   *
   * @returns {void}
   */
  public addOperatingDays(): void {
    const originalDays = this.trainRunOriginalOperatingDays();
    const isSubsetMode = originalDays.length > 0;

    const dialogRef = this.dialog.open(OperatingDaysDialogComponent, {
      maxWidth: '60vw',
      data: {
        action: DialogAction.ADD,
        isSubsetMode,
        parentOperatingDays: isSubsetMode ? originalDays : undefined,
        contentType: this.contentType(),
      },
    });

    dialogRef
      .afterClosed()
      .pipe(first())
      .subscribe((result: DaySet) => {
        if (result) {
          const existingOperatingDays = this.opreatingDaysListSig() ? [...this.opreatingDaysListSig()] : [];
          const newOperatingDayId = existingOperatingDays.length > 0 ? Math.max(...existingOperatingDays.map(od => od.id)) + 1 : 0;
          existingOperatingDays.push(this.prepareDaySetListItem(newOperatingDayId, result));
          this.opreatingDaysListSig.set(existingOperatingDays);
          this.emitOperatingDays();
        }
      });
  }

  /**
   * Opens a dialog to view or edit the operating days for a given item.
   *
   * Depending on the current mode (`isEditMode`), the dialog is configured
   * to either update or view the operating days. The dialog is pre-populated
   * with the item's data, including dates and selected/deselected days.
   *
   * In subset mode, the dialog uses original operating days data for validation
   * to ensure users can only select subsets of the original data.
   *
   * After the dialog is closed, if a result is returned, the operating days
   * list is updated with the modified data, and the updated list is emitted
   * via the `emitOperatingDays` method.
   *
   * @param item - The `DaySetListItem` containing the operating days data to be viewed or edited.
   */
  protected openOperatingDays(item: DaySetListItem): void {
    const editItemID = item.id;
    const action = this.isEditMode() ? DialogAction.UPDATE : DialogAction.VIEW;
    const originalDays = this.trainRunOriginalOperatingDays();
    const isSubsetMode = originalDays.length > 0;

    const dialogData: Partial<OperatingDaysDialogData> = {
      action,
      beginDate: item.beginDate,
      endDate: item.endDate,
      daysBitmap: item.daysBitmap,
      selectedDays: item.selectedDays,
      deselectedDays: item.deselectedDays,
      isSubsetMode,
      parentOperatingDays: isSubsetMode ? originalDays : undefined,
      contentType: this.contentType(),
    };

    const dialogRef = this.dialog.open(OperatingDaysDialogComponent, {
      maxWidth: '60vw',
      data: dialogData,
    });

    dialogRef
      .afterClosed()
      .pipe(first())
      .subscribe(result => {
        if (result) {
          const existingOperatingDays = this.opreatingDaysListSig() ? [...this.opreatingDaysListSig()] : [];
          const index = existingOperatingDays.findIndex(odt => odt.id === editItemID);
          if (index !== -1) {
            existingOperatingDays[index] = this.prepareDaySetListItem(editItemID, result);
          }
          this.opreatingDaysListSig.set(existingOperatingDays);
          this.emitOperatingDays();
        }
      });
  }

  /**
   * Deletes an operating day from the list and emits the updated list.
   *
   * @param item - The operating day item to be deleted.
   * @returns {void}
   */
  public onDeleteOperatingDays(item: DaySetListItem): void {
    const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
      width: '450px',
      data: { message: this.tr.translate('msgDeleteOdt') },
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        const currentList = this.opreatingDaysListSig();
        if (!currentList) return;

        const updatedList = currentList.filter((odt: DaySetListItem) => odt.id !== item.id);
        this.opreatingDaysListSig.set(updatedList);
        this.emitOperatingDays();
      }
    });
  }

  /**
   * Emits the selected operating days as a list of `DaySet` objects.
   *
   * This method processes the `opreatingDaysListSig` observable to transform
   * each `DaySetListItem` into a `DaySet` object. It formats the `beginDate`
   * using ISO format (YYYY-MM-DD) for API compatibility,
   * and includes the `daysBitmap`, `selectedDays`, and `deselectedDays` properties.
   *
   * The resulting list of `DaySet` objects is emitted via the `selectedOperatingDays` event emitter.
   *
   * @private
   */
  private emitOperatingDays(): void {
    this.aggregator?.notifyStateChange();
  }

  /**
   * Saves the current operating days list as a template.
   *
   * Opens a dialog for the user to save the current operating days configuration as a reusable template.
   * The method validates that edit mode is active and that there are operating days available before proceeding.
   *
   * - Only functions when in edit mode and when operating days list is not empty
   * - Uses the presaved template service to prepare a combined template from current operating days
   * - Opens a modal dialog (SaveTemplateDialogComponent) for template saving
   * - Subscribes to dialog close events and logs successful template saves
   * - Automatically unsubscribes when component is destroyed to prevent memory leaks
   *
   * @returns {void}
   */
  public saveAsTemplate(): void {
    if (!this.isEditMode() || this.opreatingDaysListSig().length === 0) {
      return;
    }

    const template = this.presavedTemplateService.prepareCombinedTemplate(this.opreatingDaysListSig());

    const dialogRef = this.dialog.open(SaveTemplateDialogComponent, {
      width: '500px',
      maxWidth: '90vw',
      data: { template },
    });

    dialogRef.afterClosed().pipe(first()).subscribe();
  }
}

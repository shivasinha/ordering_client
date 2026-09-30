import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AdminDataEntry } from '@Ordering/api';
import { SlotListColumn } from '@Ordering/shared/components/slot-list/slot-list-action.model';
import { TranslationsService } from '@Ordering/core/services/translations.service';

import { AddSignalDialogComponent } from '../dialogs/add-signal-dialog/add-signal-dialog.component';
import { ImportSignalDialogComponent } from '../dialogs/import-signal-dialog/import-signal-dialog.component';
import { AddSignalDialogData, ImportSignalDialogResult } from '../signal-dialog.model';

/**
 * Provides signals-specific display metadata and dialog-opening logic.
 * Does NOT build action configs or handle state — that is SignalsSlotComponent’s responsibility.
 * Must be provided at the component level so MatDialog resolves in the correct injector tree.
 */
@Injectable()
export class SignalsSlotService {
  private readonly tr = inject(TranslationsService);
  private readonly dialog = inject(MatDialog);

  // ─── Pre-translated display strings ────────────────────────────────────────
  readonly sectionLabel = this.tr.translate('lblSignals');
  readonly noDataMessage = this.tr.translate('lblNoSignals');
  readonly editTooltip = this.tr.translate('lblEditSignal');
  readonly deleteTooltip = this.tr.translate('lblDeleteSignal');
  readonly addLabel = this.tr.translate('lblAddSignal');
  readonly importLabel = this.tr.translate('lblImportSignal');

  /**
   * @returns {SlotListColumn<AdminDataEntry>[]} Column definitions (pre-translated headers).
   */
  getColumns(): SlotListColumn<AdminDataEntry>[] {
    return [{ field: 'display', colHeader: this.tr.translate('lblArea'), sortable: true }];
  }

  /**
   * Opens the Add Signal dialog in single-selection edit mode.
   * @param {AdminDataEntry} item - The signal to pre-populate.
   * @returns {Observable<AdminDataEntry | null>} The replacement signal, or null if dismissed.
   */
  openEditDialog(item: AdminDataEntry): Observable<AdminDataEntry | null> {
    return this.dialog
      .open(AddSignalDialogComponent, {
        width: '800px',
        data: { preselectedSignals: [item], singleSelection: true } as AddSignalDialogData,
      })
      .afterClosed()
      .pipe(map((result: AdminDataEntry[] | undefined) => result?.[0] ?? null));
  }

  /**
   * Opens the multi-select Add Signal dialog.
   * @returns {Observable<AdminDataEntry[]>} The selected signals to append.
   */
  openAddDialog(): Observable<AdminDataEntry[]> {
    return this.dialog
      .open(AddSignalDialogComponent, {
        width: '800px',
        data: { singleSelection: false } as AddSignalDialogData,
      })
      .afterClosed()
      .pipe(map((result: AdminDataEntry[] | undefined) => result ?? []));
  }

  /**
   * Opens the CSV Import Signal dialog.
   * @returns {Observable<AdminDataEntry[]>} The accepted signals to append.
   */
  openImportDialog(): Observable<AdminDataEntry[]> {
    return this.dialog
      .open(ImportSignalDialogComponent, { width: '600px' })
      .afterClosed()
      .pipe(map((result: ImportSignalDialogResult | undefined) => result?.acceptedSignals ?? []));
  }
}

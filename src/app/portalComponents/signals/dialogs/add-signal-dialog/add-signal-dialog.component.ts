import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { debounceTime, distinctUntilChanged } from 'rxjs';

import { AdminDataEntry } from '@Ordering/api';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { AddSignalDialogData } from '@Ordering/portalComponents/signals/signal-dialog.model';
import { BaseListComponent } from '@Ordering/shared/components/base-list/base-list.component';
import { BaseListConfig } from '@Ordering/shared/models/base-list-config.model';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { InfraSignalsContainerService } from '@Ordering/portalComponents/signals/services/infra-signals-container.service';

@Component({
  selector: 'app-add-signal-dialog',
  imports: [CommonModule, ReactiveFormsModule, SharedMaterialModule, MatDialogModule, TranslatePipe, BaseListComponent],
  providers: [InfraSignalsContainerService],
  templateUrl: './add-signal-dialog.component.html',
  styleUrl: './add-signal-dialog.component.scss',
})
export class AddSignalDialogComponent {
  private readonly containerService = inject(InfraSignalsContainerService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly dialogRef = inject(MatDialogRef<AddSignalDialogComponent, AdminDataEntry[] | undefined>);
  protected readonly dialogData = inject<AddSignalDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  protected readonly searchControl = new FormControl('', { nonNullable: true });

  protected readonly isLoading = computed(() => this.containerService.isLoading());
  protected readonly hasLoaded = computed(() => this.containerService.hasLoaded());
  protected readonly rows = computed(() => this.containerService.formattedData());

  protected readonly selectedSignalsById = signal<Record<string, AdminDataEntry>>({});
  protected readonly canAdd = computed(() => Object.keys(this.selectedSignalsById()).length > 0);

  protected readonly listConfig = computed(
    (): BaseListConfig<AdminDataEntry> => ({
      ...this.containerService.listConfig(),
      isRowSelected: (item: AdminDataEntry) => this.isSelected(item.id),
      rowClickable: true,
    }),
  );

  constructor() {
    const preselected = this.dialogData.preselectedSignals ?? [];
    const preselectedMap = preselected.reduce<Record<string, AdminDataEntry>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {});
    this.selectedSignalsById.set(preselectedMap);

    // Pre-populate search in single-selection (edit) mode
    const initialQuery = this.dialogData.singleSelection && preselected.length === 1 ? preselected[0].display : '';
    this.containerService.onFilterChange(this.containerService.buildFilter(initialQuery));
    if (initialQuery) {
      this.searchControl.setValue(initialQuery, { emitEvent: false });
    }

    // Debounced search
    this.searchControl.valueChanges
      .pipe(debounceTime(600), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(query => this.containerService.onFilterChange(this.containerService.buildFilter(query)));
  }

  /**
   * Toggles selection for a row on click.
   * In single-selection mode only one row can be selected at a time.
   * @param {AdminDataEntry} item - The row that was clicked.
   */
  protected onRowClick(item: AdminDataEntry): void {
    const alreadySelected = this.isSelected(item.id);

    if (this.dialogData.singleSelection) {
      this.selectedSignalsById.set(alreadySelected ? {} : { [item.id]: item });
      return;
    }

    this.selectedSignalsById.update(current => {
      const next = { ...current };
      if (alreadySelected) {
        delete next[item.id];
      } else {
        next[item.id] = item;
      }
      return next;
    });
  }

  /**
   * Checks if a row is currently selected.
   * @param {string} signalId - The ID of the row to check.
   * @returns {boolean} True if the row is selected, false otherwise.
   */
  protected isSelected(signalId: string): boolean {
    return !!this.selectedSignalsById()[signalId];
  }

  /**
   * Handles page change events from the paginator.
   * @param {PageEvent} event - The page change event.
   * @returns {void}
   */
  protected onPageChange(event: PageEvent): void {
    this.containerService.onPageChange(event);
  }

  /**
   * Handles sort change events from the table.
   * @param {Sort} sort - The sort change event.
   * @returns {void}
   */
  protected onSortChange(sort: Sort): void {
    this.containerService.onSortChange(sort);
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }

  protected onAdd(): void {
    this.dialogRef.close(Object.values(this.selectedSignalsById()));
  }
}

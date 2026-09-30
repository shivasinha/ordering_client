import { Component, output, viewChild, input, effect, computed } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { SortOrder } from '@Ordering/api';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { BaseListConfig, DEFAULT_LIST_CONFIG } from '@Ordering/shared/models/base-list-config.model';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { HasPermissionDirective } from '@Ordering/core/directives/has-permission.directive';

/**
 * Generic, reusable list component
 * 100% dumb component - receives PRE-FORMATTED data and emits events
 * Can be used for any entity type (Orders, Trains, Spare Capacity, etc.)
 *
 * @template T - The type of items in the list (should be view models with formatted values)
 */
@Component({
  selector: 'app-base-list',
  standalone: true,
  imports: [CommonModule, SharedMaterialModule, RouterModule, TranslatePipe, HasPermissionDirective],
  templateUrl: './base-list.component.html',
  styleUrl: './base-list.component.scss',
})
export class BaseListComponent<T = any> {
  // ViewChildren
  readonly paginator = viewChild(MatPaginator);
  readonly sort = viewChild(MatSort);

  // Single configuration input
  readonly listConfig = input.required<BaseListConfig<T>>();

  // Output signals
  readonly pageChange = output<PageEvent>();
  readonly sortChange = output<Sort>();
  readonly rowClick = output<T>();

  protected readonly dataSource = new MatTableDataSource<T>();

  // Only computed values that derive new state
  protected readonly displayedColumns = computed(() => {
    const cfg = this.listConfig();
    const columnFields = cfg.columns.map(c => String(c.field));
    const actions = cfg.actions ?? DEFAULT_LIST_CONFIG.actions ?? [];
    return actions.length > 0 ? [...columnFields, 'actions'] : columnFields;
  });

  constructor() {
    // Effect 1: Update data source when data changes
    effect(() => {
      this.dataSource.data = this.listConfig().data;
    });

    // Effect 2: Update sort state when sortBy or sortOrder changes from parent
    // This runs after view init when sort() is available
    effect(() => {
      const sortInstance = this.sort();

      // Guard: Only proceed if sort component is available
      if (!sortInstance) return;

      const cfg = this.listConfig();
      const sortBy = cfg.paginationAndSorting?.sortBy;
      const libSortOrder = cfg.paginationAndSorting?.sortOrder;

      // Convert library's SortOrder enum to Material's format
      const sortDirection: 'asc' | 'desc' | '' = libSortOrder === undefined ? '' : libSortOrder === SortOrder.DESC ? 'desc' : 'asc';

      if (sortBy) {
        // Apply sort
        sortInstance.active = sortBy;
        sortInstance.direction = sortDirection;
      } else {
        // Clear sort
        sortInstance.active = '';
        sortInstance.direction = '';
      }
    });
  }

  /**
   * Handles the page change event triggered by the paginator.
   * Emits the updated page event to notify parent components.
   *
   * @param {PageEvent} event - The page event containing pagination information.
   */
  protected onPageChange(event: PageEvent): void {
    this.pageChange.emit(event);
  }

  /**
   * Handles the sort change event by emitting the updated sort information.
   *
   * @param {Sort} event - The sort event containing the active sort field and direction.
   */
  protected onSortChange(event: Sort): void {
    this.sortChange.emit(event);
  }

  /**
   * Handles a row click: invokes the `onRowClick` callback from listConfig (if provided)
   * and emits the `rowClick` output event (for consumers that listen via the event instead).
   * @param {T} row - The row item that was clicked.
   */
  protected onRowClick(row: T): void {
    this.listConfig().onRowClick?.(row);
    this.rowClick.emit(row);
  }

  /**
   * Determines whether a row should be rendered as clickable (cursor + hover styling + click handler).
   * True when the config supplies an `onRowClick` callback, sets `rowClickable`, or the row itself
   * carries a `_routerLink` (legacy support).
   * @param {T} row - The row item to check.
   */
  protected isRowClickable(row: T): boolean {
    const cfg = this.listConfig();
    return !!((row as { _routerLink?: unknown })?._routerLink || cfg.rowClickable || cfg.onRowClick);
  }
}

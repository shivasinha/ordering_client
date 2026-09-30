import { CommonModule } from '@angular/common';
import { afterNextRender, Component, computed, effect, input, viewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { SlotDisplayMode } from '@Ordering/shared/models/component-slot.interface';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { SlotListConfig } from './slot-list-action.model';
import { LocalConfigService } from '@Ordering/shared/services/local-config.service';

/**
 * Purely presentational slot-list component.
 * Renders a sortable, paginated Material table driven by a single SlotListConfig input.
 * Calls action handlers directly — zero logic, zero subscriptions.
 */
@Component({
  selector: 'app-slot-list',
  standalone: true,
  imports: [CommonModule, SharedMaterialModule],
  templateUrl: './slot-list.component.html',
  styleUrl: './slot-list.component.scss',
})
export class SlotListComponent<T extends object = Record<string, unknown>> {
  /** Static display configuration: columns, actions, messages, page size. */
  readonly config = input.required<SlotListConfig<T>>();
  /** The live data to display. Parent owns and mutates this array. */
  readonly data = input<T[]>([]);
  /** Controls whether row/slot action buttons are rendered. */
  readonly displayMode = input<SlotDisplayMode>(SlotDisplayMode.EDITABLE);
  protected paginatorPageSizes: number[] = LocalConfigService.paginatorPageSizes;

  private readonly sort = viewChild(MatSort);
  private readonly paginator = viewChild(MatPaginator);

  protected readonly dataSource = new MatTableDataSource<T>([]);
  protected readonly displayedColumns = computed(() => {
    const cols = this.config().columns.map(c => String(c.field));
    const hasActions = (this.config().rowActions?.length ?? 0) > 0;
    return hasActions ? [...cols, 'actions'] : cols;
  });

  constructor() {
    effect(() => {
      this.dataSource.data = this.data();
    });

    afterNextRender(() => {
      if (this.sort()) this.dataSource.sort = this.sort();
      if (this.paginator()) this.dataSource.paginator = this.paginator();
    });
  }
}

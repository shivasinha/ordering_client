import { Component, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import { BaseListComponent } from '@Ordering/shared/components/base-list/base-list.component';
import { TrainRunFiltersComponent } from '@Ordering/portalComponents/train-run-list/train-run-filters/train-run-filters.component';
import { TrainRunListContainerService } from '@Ordering/portalComponents/train-run-list/services/train-run-list-container.service';
import { TrainRunListFilter } from '@Ordering/portalComponents/train-run-list/models/train-run-list-filter.model';

/**
 * Smart container component for the Train Run list.
 * Wires the filter component and base list component together via TrainRunListContainerService.
 */
@Component({
  selector: 'app-train-run-list-container',
  standalone: true,
  imports: [BaseListComponent, TrainRunFiltersComponent],
  providers: [TrainRunListContainerService],
  templateUrl: './train-run-list-container.component.html',
  styleUrl: './train-run-list-container.component.scss',
})
export class TrainRunListContainerComponent {
  protected readonly containerService = inject(TrainRunListContainerService);

  /**
   * Passes updated filters from the filter component down to the container service.
   *
   * @param {TrainRunListFilter} filters - The new filter values.
   */
  protected onFilterChange(filters: TrainRunListFilter): void {
    this.containerService.onFilterChange(filters);
  }

  /**
   * Passes pagination changes from the list component to the container service.
   *
   * @param {PageEvent} event - The Angular Material paginator event.
   */
  protected onPageChange(event: PageEvent): void {
    this.containerService.onPageChange(event);
  }

  /**
   * Passes sort changes from the list component to the container service.
   *
   * @param {Sort} sort - The Angular Material sort event.
   */
  protected onSortChange(sort: Sort): void {
    this.containerService.onSortChange(sort);
  }
}

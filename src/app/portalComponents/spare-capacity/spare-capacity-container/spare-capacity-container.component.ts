import { Component, inject } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';

import { SpareCapacityFilters } from '@Ordering/api';

import { BaseListComponent } from '@Ordering/shared/components/base-list/base-list.component';
import { SpareCapacityFilterComponent } from '@Ordering/portalComponents/spare-capacity/spare-capacity-filter/spare-capacity-filter.component';
import { SpareCapacityContainerService } from '@Ordering/portalComponents/spare-capacity/services/spare-capacity-container.service';

/**
 * Smart container component for Spare Capacity
 * Delegates all logic to SpareCapacityContainerService
 */
@Component({
  selector: 'app-spare-capacity-container',
  standalone: true,
  imports: [BaseListComponent, SpareCapacityFilterComponent],
  providers: [SpareCapacityContainerService],
  templateUrl: './spare-capacity-container.component.html',
  styleUrl: './spare-capacity-container.component.scss',
})
export class SpareCapacityContainerComponent {
  protected readonly spareCapacityContainerService = inject(SpareCapacityContainerService);

  // Expose container properties for template
  protected readonly currentFilters = this.spareCapacityContainerService.currentFilters;
  protected readonly listConfig = this.spareCapacityContainerService.listConfig;

  /**
   * Handles changes to the spare capacity filters by delegating the updated filters
   * to the container's `onFilterChange` method.
   *
   * @param {SpareCapacityFilters} filters - The updated filter criteria for spare capacity.
   */
  protected onFilterChange(filters: SpareCapacityFilters): void {
    this.spareCapacityContainerService.onFilterChange(filters);
  }

  /**
   * Handles the page change event triggered by the paginator.
   * Delegates the event to the container's `onPageChange` method.
   *
   * @param {PageEvent} event - The page event containing pagination information.
   */
  protected onPageChange(event: PageEvent): void {
    this.spareCapacityContainerService.onPageChange(event);
  }

  /**
   * Handles changes to the sort order by delegating the sort event to the container.
   *
   * @param {Sort} sort - The sorting information containing the active sort field and direction.
   */
  protected onSortChange(sort: Sort): void {
    this.spareCapacityContainerService.onSortChange(sort);
  }
}

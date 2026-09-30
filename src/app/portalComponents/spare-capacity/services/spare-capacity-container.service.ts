import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import dayjs from 'dayjs';
import { getLocaleDateFormat } from '@Ordering/utils/dayjs-config';

import {
  SpareCapacityFilters,
  SpareCapacityResponseList,
  SpareCapacityListItem,
  PaginationAndSorting,
  TrainRun,
  DaySet,
} from '@Ordering/api';

import { SpareCapacityListViewModel } from '@Ordering/portalComponents/spare-capacity/models/spare-capacity-view.model';
import { INITIAL_SPARE_CAPACITY_FILTER } from '@Ordering/portalComponents/spare-capacity/models/spare-capacity-filter.model';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { BaseListContainerService } from '@Ordering/shared/services/base-list-container.service';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { SpareCapacityService } from '@Ordering/portalComponents/spare-capacity/services/spare-capacity.service';
import { getDateRangeOfCombinedOperatingDays } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { DayNumbersToNamesPipe } from '@Ordering/core/pipes/day-numbers-to-names.pipe';
import {
  CreateOrderDialogComponent,
  CreateOrderDialogData,
} from '@Ordering/shared/components/create-order-dialog/create-order-dialog.component';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';

/**
 * Container service for Spare Capacity list
 * Extends base container service with entity-specific logic
 */
@Injectable()
export class SpareCapacityContainerService extends BaseListContainerService<
  SpareCapacityFilters,
  SpareCapacityListItem,
  SpareCapacityListViewModel,
  SpareCapacityResponseList
> {
  private readonly spareCapacityService = inject(SpareCapacityService);
  private readonly dialog = inject(MatDialog);
  private readonly listActionsService = inject(ListActionsService);
  private readonly dayNumbersToNamesPipe = inject(DayNumbersToNamesPipe);

  // Entity-specific configuration
  protected entityType = TabsTypesEnum.SPARE_CAPACITY;
  protected defaultFilter = INITIAL_SPARE_CAPACITY_FILTER;
  protected noDataMessage = this.tr.translate('msgEmptySpareCapacityList');

  /**
   * Fetches a list of spare capacity data from the API based on provided filters and pagination settings.
   *
   * @param {SpareCapacityFilters} filters - The filtering criteria to apply when retrieving spare capacity data.
   * @param {PaginationAndSorting} pagination - The pagination and sorting options for the data request.
   * @returns {Observable<SpareCapacityResponseList>} An Observable emitting a list of spare capacity responses.
   */
  protected fetchData(filters: SpareCapacityFilters, pagination: PaginationAndSorting): Observable<SpareCapacityResponseList> {
    return this.spareCapacityService.getSpareCapacityList(filters, pagination);
  }

  /**
   * Extracts the list of spare capacity items from the given response.
   *
   * @param {SpareCapacityResponseList} response - The response object containing the spare capacity list.
   * @returns {SpareCapacityListItem[]} An array of `SpareCapacityListItem` extracted from the response.
   */
  protected extractItems(response: SpareCapacityResponseList): SpareCapacityListItem[] | [] {
    return response.spareCapacityList || [];
  }

  /**
   * Maps a `SpareCapacityListItem` domain model to a `SpareCapacityListViewModel` for use in the view layer.
   * Example: Formats the operatingDays to show only the first pattern.
   *    return {
   *   ...item,
   *   operatingDays: item.operatingDays?.[0]
   * };
   *
   *
   * @param item - The domain model item to map.
   * @returns The mapped view model object.
   */
  protected override mapToViewModel(item: SpareCapacityListItem): SpareCapacityListViewModel {
    const beginDate = getDateRangeOfCombinedOperatingDays(item.operatingDays).beginDate;

    return {
      ...item,
      beginDate: beginDate ? dayjs(beginDate).format(getLocaleDateFormat()) : '',
      operatingDaysNames: this.getOperatingDaysColumnValue(item.operatingDays),
    };
  }

  // Column configuration
  protected get columns(): ColumnConfig<SpareCapacityListViewModel>[] {
    return [
      { field: 'routeNumber', header: this.tr.translate('lblRouteNumber') },
      { field: 'beginDate', header: this.tr.translate('lblBeginDate') },
      { field: 'operatingDaysNames', header: this.tr.translate('lblOperatingDays'), sortable: false },
      { field: 'departureTime', header: this.tr.translate('lblFromTime') },
      { field: 'fromStation', header: this.tr.translate('lblFromStation') },
      { field: 'toStation', header: this.tr.translate('lblToStation') },
      { field: 'arrivalTime', header: this.tr.translate('lblToTime') },
      { field: 'length', header: this.tr.translate('lblLength') },
      { field: 'weight', header: this.tr.translate('lblWeight') },
      { field: 'maxSpeed', header: this.tr.translate('lblMaxSpeed') },
    ];
  }

  /**
   * Returns a string representation of the operating days for display in a column.
   *
   * - If `operatingDays` is undefined or empty, returns an empty string.
   * - In the spare-capacity list, backend always returns single object of odt.
   * - If the concatination was not done at BE, odt will also contain the selectedDays array which we can directly transform to human-readable string using dayNumbersToNamesPipe.
   * - In the case of concatination, selection and deselection days arrays will be empty and method returns a translated message indicating an irregular pattern.
   *
   * @param { DaySet[] } operatingDays - An array of `DaySet` objects or undefined, representing the operating days.
   * @returns { string } A string representing the operating days, a translated irregular pattern message, or an empty string.
   */
  private getOperatingDaysColumnValue(operatingDays: DaySet[] | undefined): string {
    if (!operatingDays || operatingDays.length === 0) return '';

    if (operatingDays[0].selectedDays) return this.dayNumbersToNamesPipe.transform(operatingDays[0].selectedDays);

    return this.tr.translate('msgIrregularPattern');
  }

  // Action configuration
  protected get actions(): ActionConfig<SpareCapacityListViewModel>[] {
    return [
      {
        icon: 'file_copy',
        tooltip: this.tr.translate('lblCopyOrder'),
        handler: item => this.handleCopyOrder(item),
      },
    ];
  }

  /**
   * Handles the copy order action for a given spare capacity item.
   *
   * Fetches the train run details using the provided item's `trainId` and `schedVersionId`.
   * On successful retrieval, opens the create order dialog pre-filled with the train run data.
   * Logs an error to the console if the fetch operation fails.
   *
   * @param {SpareCapacityListViewModel} item - The spare capacity list view model containing identifiers for the train run to copy.
   * @returns {void}
   */
  private handleCopyOrder(spareCapacityListitem: SpareCapacityListViewModel): void {
    this.spareCapacityService.getSpareCapacity(spareCapacityListitem.trainId, spareCapacityListitem.schedVersionId).subscribe({
      next: (trainRun: TrainRun) => {
        this.openCreateOrderDialog(trainRun, spareCapacityListitem.routeNumber);
      },
      error: error => {
        console.error('Failed to fetch spare capacity train run:', error);
      },
    });
  }

  /**
   * Opens the Create Order dialog for a given train run and optional route number.
   *
   * This method initializes the dialog with default values and handles the dialog's close event.
   * If the dialog returns valid order data, it creates an updated `TrainRun` object (with the train number
   * possibly overridden by the form input and the secondary train number set from the route number),
   * and then triggers the creation of a new order using the updated train run and form data.
   *
   * @param {TrainRun} trainRun - The `TrainRun` object representing the current train run.
   * @param {string | undefined} routeNumber - The optional route number to be used as the secondary train number.
   */
  private openCreateOrderDialog(trainRun: TrainRun, routeNumber: string | undefined): void {
    const dialogData: CreateOrderDialogData = {
      initialOrderType: 0,
      dialogTitle: `${this.tr.translate('lblNewOrder')} - ${this.tr.translate('lblSpareCapacity')}`,
      showDescription: true,
      showTrainNo: true,
      trainNoRequired: true,
    };

    const dialogRef = this.dialog.open(CreateOrderDialogComponent, {
      width: '600px',
      maxWidth: '90vw',
      data: dialogData,
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.orderData) {
        const updatedTrainRun: TrainRun = {
          ...trainRun,
          trainNumber: result.orderData.trainNo || trainRun.trainNumber,
          secondaryTrainNumber: routeNumber || '',
        };

        this.listActionsService.createOrderFromTrainRun(
          updatedTrainRun,
          result.orderData.subject,
          result.orderData.orderType,
          result.orderData.description,
        );
      }
    });
  }
}

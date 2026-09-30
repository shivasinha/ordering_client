import { Injectable, effect, inject } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Observable, catchError, finalize, of } from 'rxjs';
import dayjs from 'dayjs';

import { PaginationAndSorting, ScheduleService, TrainRunListItem, TrainRunListResponse } from '@Ordering/api';

import { BaseListContainerService } from '@Ordering/shared/services/base-list-container.service';
import { ColumnConfig } from '@Ordering/shared/models/base-list-column.model';
import { ActionConfig } from '@Ordering/shared/models/base-list-action.model';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { TabsTypesEnum } from '@Ordering/data/custom/enum/tabTypes';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { INITIAL_TRAIN_RUN_FILTER, TrainRunListFilter } from '@Ordering/portalComponents/train-run-list/models/train-run-list-filter.model';
import { TrainRunListViewModel } from '@Ordering/portalComponents/train-run-list/models/train-run-list-view.model';
import { ActionDialogData } from '@Ordering/data/custom/action-dialog-data.interface';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';

/**
 * Container service for the Train Run list.
 * Extends BaseListContainerService to provide server-side filtering, sorting, and pagination
 * for the train run list using the GET /schedule/train-run-list-view endpoint.
 */
@Injectable()
export class TrainRunListContainerService extends BaseListContainerService<
  TrainRunListFilter,
  TrainRunListItem,
  TrainRunListViewModel,
  TrainRunListResponse
> {
  private readonly scheduleService = inject(ScheduleService);
  private readonly navigationService = inject(NavigationService);
  private readonly loadingSpinnerService = inject(LoadingSpinnerService);
  private readonly errorHandlingService = inject(ErrorHandlingService);
  private readonly filterService = inject(FilterService);
  private actionDialogService = inject(ActionDialogService);

  /** Proxy FormGroup kept in sync with current filters so TrainListActionsComponent can read date range/type. */
  private readonly filterBridgeFormGroup = new FormGroup({
    dateRange: new FormControl<{ beginDate: string | null; endDate: string | null }>({ beginDate: null, endDate: null }),
    dateRangeType: new FormControl<string | null>(null),
  });

  protected override entityType = TabsTypesEnum.TRAIN_RUNS;
  protected override defaultFilter = INITIAL_TRAIN_RUN_FILTER;
  protected override noDataMessage = this.tr.translate('msgNoListData');

  constructor() {
    super();
    this.filterService.trainFilterState = this.filterBridgeFormGroup as unknown as FormGroup;
    effect(() => {
      const filters = this.currentFilters();
      this.filterBridgeFormGroup.patchValue(
        {
          dateRange: {
            beginDate: filters.dateRange?.beginDate ?? null,
            endDate: filters.dateRange?.endDate ?? null,
          },
          dateRangeType: filters.dateRangeType ?? null,
        },
        { emitEvent: false },
      );
    });
  }

  /**
   * Fetches a paginated train run list from the backend.
   *
   * @param {TrainRunListFilter} filters - Filter criteria including date range, state, source, and showAllProjects.
   * @param {PaginationAndSorting} pagination - Pagination and sorting options.
   * @returns {Observable<TrainRunListResponse>} The paginated train run list response.
   */
  protected override fetchData(filters: TrainRunListFilter, pagination: PaginationAndSorting): Observable<TrainRunListResponse> {
    const { showAllProjects, ...apiFilters } = filters;
    this.loadingSpinnerService.showSpinner();
    return this.scheduleService.getTrainRuns(showAllProjects, apiFilters, pagination).pipe(
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetTrainRunList);
        return of({ trainRuns: [], totalCount: 0 });
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Extracts the train run items array from the API response.
   *
   * @param {TrainRunListResponse} response - The API response.
   * @returns {TrainRunListItem[]} The list of train run items.
   */
  protected override extractItems(response: TrainRunListResponse): TrainRunListItem[] {
    return response.trainRuns ?? [];
  }

  /**
   * Maps a raw API TrainRunListItem to a TrainRunListViewModel with pre-formatted display fields.
   *
   * @param {TrainRunListItem} item - The raw API item.
   * @returns {TrainRunListViewModel} The formatted view model.
   */
  protected override mapToViewModel(item: TrainRunListItem): TrainRunListViewModel {
    const dateTimeFormat = DateTimeFormat.localeDateTime;
    return {
      ...item,
      formattedLastModifiedDateTime: item.lastModifiedDateTime ? dayjs(item.lastModifiedDateTime).format(dateTimeFormat) : '',
      formattedCancellationDateTime: item.cancellationDateTime ? dayjs(item.cancellationDateTime).format(dateTimeFormat) : '',
      translatedState: item.state !== undefined ? this.tr.translateEnumValue(item.state, 'TrainState', true) : '',
      translatedSource: item.trainSource !== undefined ? this.tr.translateEnumValue(item.trainSource, 'TrainSource', true) : '',
      formattedBeginDate: item.operatingDays?.[0]?.beginDate ?? '',
      fromStationDisplay: item.fromStation?.station ?? '',
      toStationDisplay: item.toStation?.station ?? '',
    };
  }

  /**
   * Returns the column configuration for the train run list.
   */
  protected override get columns(): ColumnConfig<TrainRunListViewModel>[] {
    return [
      {
        field: 'translatedState',
        header: this.tr.translate('lblState'),
        sortField: 'state',
        // Reproduces the coloured state badge (.state.PUBLISHED / .state.CANCELLED in styles.scss).
        cssClass: item => ['state', item.state !== undefined ? this.tr.translateEnumValue(item.state, 'TrainState') : ''],
      },
      {
        field: 'trainNumber',
        header: this.tr.translate('lblTrainNumber'),
        sortField: 'trainNumber',
      },
      {
        field: 'formattedBeginDate',
        header: this.tr.translate('lblBeginDate'),
        sortField: 'beginDate',
      },
      {
        field: 'trainType',
        header: this.tr.translate('lblTrainType'),
        sortable: true,
      },
      {
        field: 'fromStationDisplay',
        header: this.tr.translate('lblFromStation'),
        sortable: false,
      },
      {
        field: 'toStationDisplay',
        header: this.tr.translate('lblToStation'),
        sortable: false,
      },
      {
        field: 'formattedLastModifiedDateTime',
        header: this.tr.translate('lblLastChanged'),
        sortField: 'lastModifiedDateTime',
      },
      {
        field: 'formattedCancellationDateTime',
        header: this.tr.translate('lblCancellationDate'),
        sortField: 'cancellationDateTime',
      },
      {
        field: 'translatedSource',
        header: this.tr.translate('lblSource'),
        sortField: 'trainSource',
      },
    ];
  }

  /**
   * Returns row actions for each train run item (view, cancel, copy, modify).
   * Visibility is controlled by UserPermissionService checks.
   */
  protected override get actions(): ActionConfig<TrainRunListViewModel>[] {
    return [
      {
        icon: 'visibility',
        tooltip: this.tr.translate('lblView'),
        handler: (item: TrainRunListViewModel) => this.navigateToTrainRun(item),
      },
      {
        icon: 'cancel',
        tooltip: this.tr.translate('lblCancelTrainRun'),
        visible: (item: TrainRunListViewModel) => this.userPermissionService.canCancelTrainRun(item),
        handler: (item: TrainRunListViewModel) => this.handleTrainRunAction(item, TrainListActions.CANCEL_TRAIN_PATH),
      },
      {
        icon: 'edit',
        tooltip: this.tr.translate('lblModifyTrainRun'),
        visible: (item: TrainRunListViewModel) => this.userPermissionService.canModifyTrainRun(item),
        handler: (item: TrainRunListViewModel) => this.handleTrainRunAction(item, TrainListActions.MODIFY_TRAIN_RUN),
      },
      {
        icon: 'file_copy',
        tooltip: this.tr.translate('lblCopyTrainRun'),
        handler: (item: TrainRunListViewModel) => this.handleTrainRunAction(item, TrainListActions.COPY_TRAIN_RUN),
      },
    ];
  }

  /**
   * Returns a row-click handler that navigates to the train run detail page.
   *
   * @returns {(item: TrainRunListViewModel) => void} The row click handler.
   */
  protected override getOnRowClick(): (item: TrainRunListViewModel) => void {
    return (item: TrainRunListViewModel) => this.navigateToTrainRun(item);
  }

  /**
   * Navigates to the train run detail page.
   *
   * @param {TrainRunListViewModel} item - The train run view model.
   */
  private navigateToTrainRun(item: TrainRunListViewModel): void {
    this.navigationService.navigate(['/train-run', String(item.trainId), String(item.schedVersionId)]);
  }

  /**
   * Handles train run actions such as cancel or modify.
   *
   * @param {TrainRunListViewModel} trainRunListItem The train run list item.
   * @param {TrainListActions} action The action to be performed (cancel or modify).
   */
  private handleTrainRunAction(trainRunListItem: TrainRunListViewModel, action: TrainListActions): void {
    const dialogeData: ActionDialogData = {
      action: action,
      trainRunListItemData: trainRunListItem,
    };
    this.actionDialogService.openActionDialog(dialogeData).subscribe(result => {
      if (result) {
        this.navigationService.navigateToList();
      }
    });
  }
}

import { Injectable, inject } from '@angular/core';
import { Observable, catchError, finalize, of } from 'rxjs';
import {
  SpareCapacityResponseList,
  SpareCapacityFilters,
  PaginationAndSorting,
  SpareCapacityService as LibSpareCapacityService,
  TrainRun,
} from '@Ordering/api';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

/**
 * Service for Spare Capacity data management
 * Wraps the library's SpareCapacityService with error handling and loading state
 */
@Injectable({
  providedIn: 'root',
})
export class SpareCapacityService {
  private readonly libSpareCapacityService = inject(LibSpareCapacityService);
  private readonly loadingSpinnerService = inject(LoadingSpinnerService);
  private readonly errorHandlingService = inject(ErrorHandlingService);

  /**
   * Retrieves a list of spare capacity items based on provided filters and pagination options.
   * Shows a loading spinner while the request is in progress and hides it upon completion.
   * Handles errors by invoking the error handling service and returns an empty result to prevent UI breakage.
   *
   * @param {SpareCapacityFilters} filters - Optional filters to apply when fetching spare capacity items.
   * @param {PaginationAndSorting} pagination - Optional pagination and sorting options.
   * @returns {Observable<SpareCapacityResponseList>} An Observable emitting a {@link SpareCapacityResponseList} containing the list of spare capacity items and the total count.
   */
  public getSpareCapacityList(filters?: SpareCapacityFilters, pagination?: PaginationAndSorting): Observable<SpareCapacityResponseList> {
    this.loadingSpinnerService.showSpinner();

    return this.libSpareCapacityService.getSpareCapacityList(filters, pagination).pipe(
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetSpareCapacityList);
        // Return empty result on error so UI doesn't break
        const emptyResponse: SpareCapacityResponseList = { spareCapacityList: [], totalCount: 0 };
        return of(emptyResponse);
      }),
      finalize(() => {
        this.loadingSpinnerService.hideSpinner();
      }),
    );
  }

  /**
   * Retrieves a single spare capacity train run by trainId and schedVersionId.
   * Shows a loading spinner while the request is in progress and hides it upon completion.
   * Handles errors by invoking the error handling service.
   *
   * @param {number} trainId - The identifier of the train run within a specific schedule version.
   * @param {number} schedVersionId - The identifier of the timetable/schedule version.
   * @returns {Observable<TrainRun>} An Observable emitting a {@link TrainRun} object.
   */
  public getSpareCapacity(trainId: number, schedVersionId: number): Observable<TrainRun> {
    this.loadingSpinnerService.showSpinner();

    return this.libSpareCapacityService.getSpareCapacity(trainId, schedVersionId).pipe(
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetSpareCapacity);
        throw error;
      }),
      finalize(() => {
        this.loadingSpinnerService.hideSpinner();
      }),
    );
  }
}

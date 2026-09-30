import { inject, Injectable } from '@angular/core';
import { catchError, EMPTY, finalize, map, Observable, of, tap } from 'rxjs';
import { ScheduleService, TrainRun, TrainRunListItem, TrainRunListResponse } from '@Ordering/api';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

@Injectable({
  providedIn: 'root',
})
export class ScheduleActionService {
  private scheduleService = inject(ScheduleService);
  private loadingSpinnerService = inject(LoadingSpinnerService);
  private errorHandlingService = inject(ErrorHandlingService);
  protected readonly All_PROJECTS = 'allProjects';
  public tr = inject(TranslationsService);

  /**
   * Retrieves a list of train runs for a given project.
   *
   * If a project is provided, it shows a loading spinner, fetches the train runs from the schedule service,
   * and returns them as an observable. If an error occurs during the fetch, a notification is pushed and an empty array is returned.
   * The loading spinner is hidden once the operation is finalized.
   *
   * If no project is provided, a notification is pushed and an empty observable is returned.
   *
   * @param {string | undefined} project - The project identifier or undefined.
   * @returns {Observable<TrainRunListItem[]>} An observable containing the list of train runs.
   */
  public getTrainRunListbyProject(params?: any): Observable<TrainRunListItem[]> {
    this.loadingSpinnerService.showSpinner();
    return this.scheduleService.getTrainRuns(params).pipe(
      map((response: TrainRunListResponse) => response.trainRuns),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetTrainRunList);
        return of([]);
      }),
      finalize(() => this.loadingSpinnerService.hideSpinner()),
    );
  }

  /**
   * Fetches the train run details for a specified train number and operating day.
   * This method triggers a loading spinner while the request is in progress.
   * On successful completion, it returns the train run details.
   * If the request fails, an error notification is displayed using the notification service,
   * and an empty observable is returned to handle the failure gracefully.
   *
   * @param {TrainRunListItem} data - An object containing the train number and the operating day's start date.
   * @param {string} data.trainNumber - The train number for which details are requested.
   * @param {Object} data.operatingDays - An object representing the operating days.
   * @param {string} data.operatingDays.beginDate - The start date of the train's operation.
   * @returns {Observable<TrainRun>} - An Observable that emits the TrainRun details upon success.
   */
  public getTrainRun(data: TrainRunListItem): Observable<TrainRun> {
    return this.scheduleService.getTrainRun(data.trainId, data.schedVersionId).pipe(
      tap((response: TrainRun) => response),
      catchError(error => {
        this.errorHandlingService.handleError(error, OrderingApiName.GetTrainRun);
        return EMPTY;
      }),
    );
  }
}

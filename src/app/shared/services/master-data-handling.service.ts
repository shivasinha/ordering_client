import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';

import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import {
  AdminDataEntry,
  AdminDataResult,
  AdminDataResponse,
  Holiday,
  MasterDataService,
  OperatorResponse,
  RefCodeResponse,
  StationResponse,
  TractionUnit,
  TrainTypeResponse,
} from '@Ordering/api';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

type ErrorMessages =
  | 'msgErrorFetchHolidays'
  | 'msgErrorFetchTractionUnits'
  | 'msgErrorFetchStations'
  | 'msgErrorFetchTrainTypes'
  | 'msgErrorFetchOperators'
  | 'msgErrorFetchRefCodes'
  | 'msgErrorFetchRestrictionProjects'
  | 'msgErrorFetchRestrictionSubProjects'
  | 'msgErrorFetchOrganizations'
  | 'msgErrorFetchTypeOfWorks';

@Injectable({
  providedIn: 'root',
})
export class MasterDataHandlingService {
  private tr = inject(TranslationsService);
  private masterDataService = inject(MasterDataService);
  private notificationService = inject(NotificationService);

  // Public variables to hold the data as Signals
  public masterDataOperatorsSig: WritableSignal<OperatorResponse[]> = signal<OperatorResponse[]>([]);
  public masterDataTrainTypesSig: WritableSignal<TrainTypeResponse[]> = signal<TrainTypeResponse[]>([]);
  public masterDataStationsSig: WritableSignal<StationResponse[]> = signal<StationResponse[]>([]);
  public masterDataTractionUnitsSig: WritableSignal<TractionUnit[]> = signal<TractionUnit[]>([]);
  public masterDataHolidaysListSig: WritableSignal<Holiday[]> = signal<Holiday[]>([]);
  public masterDataRefCodesSig: WritableSignal<AdminDataEntry[]> = signal<AdminDataEntry[]>([]);
  public masterDataRefCodeGroupsSig: WritableSignal<Record<string, AdminDataEntry[]>> = signal<Record<string, AdminDataEntry[]>>({});
  public masterDataRestrictionProjectsSig: WritableSignal<AdminDataEntry[]> = signal<AdminDataEntry[]>([]);
  public masterDataOrganizationsSig: WritableSignal<AdminDataEntry[]> = signal<AdminDataEntry[]>([]);
  public masterDataTypeOfWorksSig: WritableSignal<AdminDataEntry[]> = signal<AdminDataEntry[]>([]);
  // Sub-projects are keyed by their parent restriction project id.
  public masterDataRestrictionSubProjectsSig: WritableSignal<Record<string, AdminDataEntry[]>> = signal<Record<string, AdminDataEntry[]>>(
    {},
  );

  /**
   * Fetches all the master data if the signals are empty.
   * @returns {void}
   */
  public fetchAllMasterData(): void {
    this.fetchOperators();
    this.fetchTrainTypes();
    this.fetchStations();
    this.fetchTractionUnits();
    this.fetchHolidaysList();
    this.fetchOrganizations();
  }

  /**
   * Fetches the list of operators by invoking the `getOperators` method
   * from the `masterDataService`. This method ensures that the data is
   * fetched only if it is not already available, using the `fetchDataIfEmpty` utility.
   *
   * If an error occurs during the fetch operation, the error message
   * associated with the key 'msgErrorFetchOperators' will be used.
   *
   * @returns {void}
   */
  public fetchOperators(): void {
    this.fetchDataIfEmpty(this.masterDataOperatorsSig, () => this.masterDataService.getOperators(), 'msgErrorFetchOperators');
  }

  /**
   * Fetches train types data and ensures it is loaded into the application state.
   *
   * This method checks if the train types data is empty and, if so, triggers a fetch
   * operation using the `masterDataService.getTrainTypes()` method. Any errors during
   * the fetch process are associated with the error message key 'msgErrorFetchTrainTypes'.
   *
   * The fetched data is managed using the `masterDataTrainTypesSig` signal.
   *
   * @returns {void}
   */
  public fetchTrainTypes(): void {
    this.fetchDataIfEmpty(this.masterDataTrainTypesSig, () => this.masterDataService.getTrainTypes(), 'msgErrorFetchTrainTypes');
  }

  /**
   * Fetches station data by invoking the `fetchDataIfEmpty` method.
   * This ensures that station data is retrieved only if it is not already available.
   * The data is fetched using the `getStations` method from the `masterDataService`.
   * If an error occurs during the fetch operation, the error message key 'msgErrorFetchStations' is used.
   *
   * @returns {void}
   */
  public fetchStations(): void {
    this.fetchDataIfEmpty(this.masterDataStationsSig, () => this.masterDataService.getStations(), 'msgErrorFetchStations');
  }

  /**
   * Fetches the traction units data by invoking the `fetchDataIfEmpty` method.
   * Ensures that the data is only fetched if it is not already available.
   * Utilizes the `masterDataService.getTractionUnits` method to retrieve the data.
   * Logs an error message with the key 'msgErrorFetchTractionUnits' in case of failure.
   *
   * @returns {void}
   */
  public fetchTractionUnits(): void {
    this.fetchDataIfEmpty(this.masterDataTractionUnitsSig, () => this.masterDataService.getTractionUnits(), 'msgErrorFetchTractionUnits');
  }

  /**
   * Fetches the list of holidays and updates the master data signal if the list is empty.
   * Utilizes the `fetchDataIfEmpty` method to ensure data is only fetched when necessary.
   * If an error occurs during the fetch operation, an error message with the key
   * 'msgErrorFetchHolidays' will be used for error handling.
   *
   * @returns {void}
   */
  public fetchHolidaysList(): void {
    this.fetchDataIfEmpty(this.masterDataHolidaysListSig, () => this.masterDataService.getHolidaysList(), 'msgErrorFetchHolidays');
  }

  /**
   * Fetches the list of reference codes (GET /data/refcodes) and unwraps the
   * AdminDataResponse into its `result.entries`. The cached list is exposed via
   * `masterDataRefCodesSig` and re-fetching is skipped while it is non-empty.
   *
   * @returns {void}
   */
  public fetchRefCodes(): void {
    this.fetchRefCodeDataIfEmpty(this.masterDataRefCodesSig, () => this.masterDataService.getRefCodes(), 'msgErrorFetchRefCodes');
  }

  /**
   * Fetches all restriction projects (GET /data/restrictionprojects) and unwraps the
   * AdminDataResponse into its `result.entries`. The cached list is exposed via
   * `masterDataRestrictionProjectsSig` and re-fetching is skipped while it is non-empty.
   *
   * @returns {void}
   */
  public fetchRestrictionProjects(): void {
    this.fetchAdminDataIfEmpty(
      this.masterDataRestrictionProjectsSig,
      () => this.masterDataService.getRestrictionProjects(),
      'msgErrorFetchRestrictionProjects',
    );
  }

  /**
   * Fetches restriction sub-projects (GET /data/restrictionprojects/{project-id})
   * for the given restriction project id and caches them under that key in
   * `masterDataRestrictionSubProjectsSig`. Re-fetching for the same id is skipped
   * while a non-empty entry already exists.
   *
   * @param projectId Restriction project id whose sub-projects are requested.
   * @returns {void}
   */
  public fetchRestrictionSubProjects(projectId: string): void {
    if (projectId.trim().length === 0) {
      return;
    }

    const current = this.masterDataRestrictionSubProjectsSig()[projectId];
    if (current && current.length > 0) {
      return;
    }
    this.masterDataService
      .getRestrictionSubProjects(projectId)
      .pipe(
        map((response: AdminDataResponse) => response.result.entries ?? []),
        tap((entries: AdminDataEntry[]) => {
          this.masterDataRestrictionSubProjectsSig.update(map => ({ ...map, [projectId]: entries }));
        }),
        catchError(() => {
          this.notificationService.pushNotification(this.tr.translate('msgErrorFetchRestrictionSubProjects'), SNACKBARCONFIG_ERROR);
          this.masterDataRestrictionSubProjectsSig.update(map => ({ ...map, [projectId]: [] }));
          return of([]);
        }),
      )
      .subscribe();
  }

  /**
   * Fetches the list of organizations (GET /data/masterData) and unwraps the
   * AdminDataResponse into its `result.entries`. The cached list is exposed via
   * `masterDataOrganizationsSig` and re-fetching is skipped while it is non-empty.
   *
   * @returns {void}
   */
  public fetchOrganizations(): void {
    this.fetchAdminDataIfEmpty(
      this.masterDataOrganizationsSig,
      () => this.masterDataService.getOrganizations(),
      'msgErrorFetchOrganizations',
    );
  }

  /**
   * Fetches the list of work types (GET /data/type-of-works) and unwraps the
   * AdminDataResponse into its `result.entries`. The cached list is exposed via
   * `masterDataTypeOfWorksSig` and re-fetching is skipped while it is non-empty.
   *
   * @returns {void}
   */
  public fetchTypeOfWorks(): void {
    this.fetchAdminDataIfEmpty(this.masterDataTypeOfWorksSig, () => this.masterDataService.getWorkTypes(), 'msgErrorFetchTypeOfWorks');
  }

  /**
   * Fetches data using the provided `fetchFunction` if the current data in the `signal` is empty.
   * Updates the `signal` with the fetched data or an empty array in case of an error.
   *
   * @template T - The type of data being fetched and stored in the signal.
   * @param signal - An object containing a getter function to retrieve the current data
   *                 and a setter function to update the data.
   * @param fetchFunction - A function that performs the data fetching operation and returns an observable.
   * @param errorMessageKey - A key used to retrieve the error message for notifications in case of a fetch failure.
   *
   * @remarks
   * - If the `signal` already contains data, the `fetchFunction` will not be called.
   * - If an error occurs during the fetch operation, a notification will be pushed, and the `signal` will be set to an empty array.
   *
   * @example
   * ```typescript
   * const signal = {
   *   (): MyDataType[] => this.myData,
   *   set: (value: MyDataType[]) => { this.myData = value; }
   * };
   *
   * this.fetchDataIfEmpty(signal, this.myFetchFunction, ErrorMessages.FetchFailed);
   * ```
   *
   * @returns {void}
   */
  private fetchDataIfEmpty<T>(signal: WritableSignal<T[]>, fetchFunction: () => any, errorMessageKey: ErrorMessages): void {
    if (signal().length === 0) {
      fetchFunction()
        .pipe(
          tap((data: T[]) => {
            signal.set(data); // Assign data to the signal
          }),
          catchError(() => {
            this.notificationService.pushNotification(this.tr.translate(errorMessageKey), SNACKBARCONFIG_ERROR);
            signal.set([]); // Default to an empty array if there is an error
            return of([]);
          }),
        )
        .subscribe();
    }
  }

  /**
   * Variant of `fetchDataIfEmpty` for AdminDataResponse endpoints.
   * Unwraps `response.result.entries` before assigning to the signal.
   */
  private fetchAdminDataIfEmpty(signal: WritableSignal<AdminDataEntry[]>, fetchFunction: () => any, errorMessageKey: ErrorMessages): void {
    if (signal().length > 0) {
      return;
    }
    fetchFunction()
      .pipe(
        map((response: AdminDataResponse) => response.result.entries ?? []),
        tap((entries: AdminDataEntry[]) => signal.set(entries)),
        catchError(() => {
          this.notificationService.pushNotification(this.tr.translate(errorMessageKey), SNACKBARCONFIG_ERROR);
          signal.set([]);
          return of([]);
        }),
      )
      .subscribe();
  }

  /**
   * Variant of `fetchDataIfEmpty` for RefCodeResponse endpoints.
   * Flattens `response.result[].entries` before assigning to the signal.
   */
  private fetchRefCodeDataIfEmpty(
    signal: WritableSignal<AdminDataEntry[]>,
    fetchFunction: () => any,
    errorMessageKey: ErrorMessages,
  ): void {
    if (signal().length > 0) {
      return;
    }
    fetchFunction()
      .pipe(
        tap((response: RefCodeResponse) => {
          const groupedEntries = this.groupRefCodesByTable(response.result);
          const entries = response.result.flatMap(result => result.entries ?? []);
          this.masterDataRefCodeGroupsSig.set(groupedEntries);
          signal.set(entries);
        }),
        catchError(() => {
          this.notificationService.pushNotification(this.tr.translate(errorMessageKey), SNACKBARCONFIG_ERROR);
          this.masterDataRefCodeGroupsSig.set({});
          signal.set([]);
          return of([]);
        }),
      )
      .subscribe();
  }

  private groupRefCodesByTable(results: AdminDataResult[]): Record<string, AdminDataEntry[]> {
    return results.reduce<Record<string, AdminDataEntry[]>>((groups, result) => {
      groups[result.table] = result.entries ?? [];
      return groups;
    }, {});
  }
}

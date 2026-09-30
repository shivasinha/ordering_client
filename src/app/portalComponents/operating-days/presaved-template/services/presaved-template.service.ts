import { Injectable, inject, Signal, signal } from '@angular/core';
import { Observable, tap, catchError, finalize } from 'rxjs';

import { ODTTemplateService, PresavedODTTemplate } from '@Ordering/api';

import { PresavedTemplateFilterCriteria } from '@Ordering/portalComponents/operating-days/presaved-template/models/presaved-template-filter.interface';
import { getDateRangeOfCombinedOperatingDays } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { SNACKBARCONFIG_SUCCESS, SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { DaySetListItem } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { OperatingDaysCalculationService } from '@Ordering/portalComponents/operating-days/operating-days-calculation.service';
import { normalizeToAPIDate } from '@Ordering/utils/dates';

@Injectable({
  providedIn: 'root',
})
export class PresavedTemplateService {
  private readonly oDTTemplateService = inject(ODTTemplateService);
  private readonly loadingSpinnerService = inject(LoadingSpinnerService);
  private readonly notificationService = inject(NotificationService);
  private readonly errorHandlingService = inject(ErrorHandlingService);
  private readonly tr = inject(TranslationsService);
  private readonly operatingDaysCalculatorService = inject(OperatingDaysCalculationService);

  // Signal to track loading state
  private readonly isLoading = signal<boolean>(false);

  /**
   * Fetches presaved ODT templates based on filter criteria
   *
   * @param filterCriteria - The filter criteria for the API call
   * @returns Observable<Array<PresavedODTTemplate>> - List of templates
   */
  public getPresavedTemplates(filterCriteria: PresavedTemplateFilterCriteria): Observable<Array<PresavedODTTemplate>> {
    this.isLoading.set(true);
    const query = this.buildQueryParams(filterCriteria);
    return this.oDTTemplateService.getPresavedOdts(query.beginDate, query.endDate, query.matchAnyDate, query.searchString).pipe(
      tap(templates => {
        this.isLoading.set(false);
        return templates;
      }),
    );
  }

  get isLoadingSignal(): Signal<boolean> {
    return this.isLoading.asReadonly();
  }

  /**
   * Converts filter criteria to query parameters object (for future use)
   *
   * @param filterCriteria - Filter criteria
   * @returns PresavedTemplateQueryParams object
   */
  public buildQueryParams(filterCriteria: PresavedTemplateFilterCriteria): PresavedTemplateFilterCriteria {
    const queryParams: PresavedTemplateFilterCriteria = {
      matchAnyDate: filterCriteria.matchAnyDate,
      beginDate: normalizeToAPIDate(filterCriteria.beginDate),
      endDate: normalizeToAPIDate(filterCriteria.endDate),
    };

    if (filterCriteria.searchString && filterCriteria.searchString.trim()) {
      queryParams.searchString = filterCriteria.searchString.trim();
    }

    return queryParams;
  }

  /**
   * Prepares a combined presaved operating days template from a list of operating day items.
   *
   * This method takes multiple operating day items, filters out invalid entries, combines their
   * operating days using the calculator service, and creates a new template with the merged
   * day bitmap and calculated date range.
   *
   * - Filters out items without valid beginDate or daysBitmap
   * - Uses operatingDaysCalculatorService to combine the day sets
   * - The returned template has empty name and description fields that should be populated by the caller
   * - selectedDays and deselectedDays arrays are intentionally left empty
   *
   * @param {DaySetListItem[]} operatingDaysList - Array of operating day items to combine into a single template
   * @returns {PresavedODTTemplate} A new PresavedODTTemplate with combined operating days data, empty name/description
   *          (to be set by dialog), and empty selectedDays/deselectedDays arrays
   * @throws {Error} When no valid operating days are provided or found in the list
   */
  public prepareCombinedTemplate(operatingDaysList: DaySetListItem[]): PresavedODTTemplate {
    if (!operatingDaysList || operatingDaysList.length === 0) {
      throw new Error('No valid operating days provided to combine.');
    }

    // Since DaySetListItem extends DaySet, we can use them directly as DaySet objects
    // Filter out any items without valid beginDate or daysBitmap
    const daySets = operatingDaysList.filter(item => item.beginDate && item.daysBitmap);

    if (daySets.length === 0) {
      throw new Error('No valid operating days found in the provided list.');
    }

    const combinedDaySet = this.operatingDaysCalculatorService.combineOperatingDays(daySets);

    const dateRange = getDateRangeOfCombinedOperatingDays(daySets);

    // Create the combined template
    const combinedTemplate: PresavedODTTemplate = {
      name: '', // Will be set by the dialog
      description: '', // Will be set by the dialog
      endDate: dateRange.endDate,
      operatingDays: {
        beginDate: dateRange.beginDate,
        daysBitmap: combinedDaySet.daysBitmap,
        selectedDays: [], // Empty as requested
        deselectedDays: [], // Empty as requested
      },
    };

    return combinedTemplate;
  }

  /**
   * Saves a new presaved ODT template.
   *
   * Shows loading spinner during the operation and displays appropriate success/error notifications.
   * Handles backend uniqueness validation for template names.
   *
   * @param template - The template data to save
   * @returns Observable<PresavedODTTemplate> - The saved template on success
   */
  public savePresavedTemplate(template: PresavedODTTemplate): Observable<PresavedODTTemplate> {
    this.loadingSpinnerService.showSpinner();
    this.isLoading.set(true);
    return this.oDTTemplateService.createPresavedOdts(template).pipe(
      tap(savedTemplate => {
        this.notificationService.pushNotification(
          this.tr.translate('msgTemplateSavedSuccessfully'), // Template saved successfully message
          SNACKBARCONFIG_SUCCESS,
        );
        return savedTemplate;
      }),
      catchError(error => {
        if (error.status === 409) {
          // Conflict - template name already exists
          this.notificationService.pushNotification(this.tr.translate('msgTemplateNameAlreadyExists'), SNACKBARCONFIG_ERROR);
        } else {
          // Other errors - use generic error handling
          this.errorHandlingService.handleError(error, '' as any);
        }
        throw error;
      }),
      finalize(() => {
        this.loadingSpinnerService.hideSpinner();
        this.isLoading.set(false);
      }),
    );
  }
}

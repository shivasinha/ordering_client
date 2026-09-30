import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { OrderingApiErrorOverrides } from '@Ordering/data/custom/api-error-overrides.map';
import { Subject } from 'rxjs';
import { generateTranslationKey } from '@Ordering/utils/translation-key-genrator';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlingService {
  private tr = inject(TranslationsService);
  private notificationService = inject(NotificationService);

  // Subject to emit when 401 unauthorized error occurs
  private unauthorizedSubject = new Subject<void>();
  public unauthorized$ = this.unauthorizedSubject.asObservable();

  private readonly defaultMessages: Record<number, string> = {
    401: this.tr.translate('msgErrorStatus401'),
    403: this.tr.translate('msgErrorStatus403'),
    404: this.tr.translate('msgErrorStatus404'),
    500: this.tr.translate('msgErrorStatus500'),
  };

  /**
   * Handles API errors by showing appropriate notifications.
   * @param {HttpErrorResponse} error The HTTP error response.
   * @param {OrderingApiName} apiName The name of the API that caused the error.
   * @returns void
   */
  public handleError(error: HttpErrorResponse, apiName: OrderingApiName): void {
    const status = error.status;

    if (status === 401) {
      this.notify(this.defaultMessages[401] || 'Unauthorized access. Please login.');
      // Emit event instead of directly calling auth service to avoid circular dependency
      this.unauthorizedSubject.next();
      return;
    }

    if (status === 422) {
      const parsedErrorMessage = error.error?.id
        ? this.tr.translate(generateTranslationKey(error.error.id, 'msgError', '-') as any)
        : error.message;
      this.notify(parsedErrorMessage);
      return;
    }

    const apiOverrides = OrderingApiErrorOverrides[apiName];
    const specificMessage = apiOverrides?.[status];
    const fallbackApiMessage = apiOverrides?.['default'];
    const defaultMessage = this.defaultMessages[status];

    let finalMessage: string | undefined;
    if (specificMessage) {
      finalMessage = this.tr.translate(specificMessage as any);
    } else if (fallbackApiMessage) {
      finalMessage = this.tr.translate(fallbackApiMessage as any);
    } else if (defaultMessage) {
      finalMessage = defaultMessage;
    } else {
      finalMessage = this.tr.translate('msgErrorStatusDefault');
    }

    this.notify(finalMessage ?? error.message);

    if (!finalMessage) {
      console.warn(`Unhandled HTTP status: ${status}`, error);
    }
  }

  private notify(message: string): void {
    this.notificationService.pushNotification(message, SNACKBARCONFIG_ERROR);
  }
}

import { TestBed } from '@angular/core/testing';
import { ErrorHandlingService } from './error-handling.service';
import { NotificationService } from './notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { generateTranslationKey } from '@Ordering/utils/translation-key-genrator';

// Mock the generateTranslationKey function
jest.mock('@Ordering/utils/translation-key-genrator', () => ({
  generateTranslationKey: jest.fn(),
}));

describe('ErrorHandlingService', () => {
  let service: ErrorHandlingService;
  let notificationServiceSpy: jest.Mocked<NotificationService>;
  let translationsServiceSpy: jest.Mocked<TranslationsService>;
  let generateTranslationKeySpy: jest.MockedFunction<typeof generateTranslationKey>;

  beforeEach(() => {
    const notificationSpy = { pushNotification: jest.fn() };
    const translationsSpy = { translate: jest.fn().mockImplementation((key: string) => key) };

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlingService,
        { provide: NotificationService, useValue: notificationSpy },
        { provide: TranslationsService, useValue: translationsSpy },
      ],
    });

    service = TestBed.inject(ErrorHandlingService);
    notificationServiceSpy = TestBed.inject(NotificationService) as jest.Mocked<NotificationService>;
    translationsServiceSpy = TestBed.inject(TranslationsService) as jest.Mocked<TranslationsService>;
    generateTranslationKeySpy = generateTranslationKey as jest.MockedFunction<typeof generateTranslationKey>;

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should handle 401 error by notifying and emitting unauthorized event', () => {
    const error = new HttpErrorResponse({ status: 401 });
    const apiName = OrderingApiName.GetCurrentOrdersList;

    // Spy on the unauthorized observable
    const unauthorizedSpy = jest.fn();
    service.unauthorized$.subscribe(unauthorizedSpy);

    service.handleError(error, apiName);

    expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith('msgErrorStatus401', expect.any(Object));
    expect(unauthorizedSpy).toHaveBeenCalled();
  });

  it('should notify with translated error message for known status codes', () => {
    const error = new HttpErrorResponse({ status: 403 });
    const apiName = OrderingApiName.GetCurrentOrdersList;
    translationsServiceSpy.translate.mockReturnValue('Translated forbidden message');

    service.handleError(error, apiName);

    expect(translationsServiceSpy.translate).toHaveBeenCalledWith('msgErrorForbiddenGetCurrentOrdersList');
    expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith('Translated forbidden message', expect.any(Object));
  });

  it('should notify with default error message for unknown status codes', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const error = new HttpErrorResponse({ status: 999, statusText: 'Unknown Error', error: 'Test error message' });
    const apiName = OrderingApiName.GetCurrentOrdersList;
    translationsServiceSpy.translate.mockReturnValue('Default error message');

    service.handleError(error, apiName);

    expect(translationsServiceSpy.translate).toHaveBeenCalledWith('msgErrorGetCurrentOrderList');
    expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith('Default error message', expect.any(Object));
    expect(consoleWarnSpy).not.toHaveBeenCalled(); // Should not warn since we have a fallback message
    consoleWarnSpy.mockRestore();
  });

  it('should use API default message when status not specifically overridden', () => {
    const error = new HttpErrorResponse({ status: 500 });
    const apiName = OrderingApiName.GetCurrentOrdersList;
    translationsServiceSpy.translate.mockReturnValue('Translated default message');

    service.handleError(error, apiName);

    expect(translationsServiceSpy.translate).toHaveBeenCalledWith('msgErrorGetCurrentOrderList');
    expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith('Translated default message', expect.any(Object));
  });

  it('should use translation service fallback when no other message found', () => {
    const error = new HttpErrorResponse({ status: 418 }); // I'm a teapot - not in defaultMessages
    const apiName = OrderingApiName.GetCurrentOrdersList;
    translationsServiceSpy.translate.mockReturnValue('Final fallback message');

    service.handleError(error, apiName);

    expect(translationsServiceSpy.translate).toHaveBeenCalledWith('msgErrorGetCurrentOrderList');
    expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith('Final fallback message', expect.any(Object));
  });

  describe('422 error handling', () => {
    it('should handle 422 error with error.error.id and generate translation key with hyphen separator', () => {
      const errorId = 'validation-failed-invalid-data';
      const error = new HttpErrorResponse({
        status: 422,
        error: { id: errorId },
      });
      const apiName = OrderingApiName.GetCurrentOrdersList;
      const expectedTranslationKey = 'msgErrorValidationFailedInvalidData';
      const translatedMessage = 'Validation failed for invalid data';

      generateTranslationKeySpy.mockReturnValue(expectedTranslationKey);
      translationsServiceSpy.translate.mockReturnValue(translatedMessage);

      service.handleError(error, apiName);

      expect(generateTranslationKeySpy).toHaveBeenCalledWith(errorId, 'msgError', '-');
      expect(translationsServiceSpy.translate).toHaveBeenCalledWith(expectedTranslationKey);
      expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith(translatedMessage, expect.any(Object));
    });

    function test422ErrorFallback(error: HttpErrorResponse) {
      const apiName = OrderingApiName.GetCurrentOrdersList;

      service.handleError(error, apiName);

      expect(generateTranslationKeySpy).not.toHaveBeenCalled();
      expect(translationsServiceSpy.translate).not.toHaveBeenCalled();
      expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith(error.message, expect.any(Object));
    }

    it('should handle 422 error with undefined error.error.id', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: { id: undefined },
        statusText: 'Validation failed',
      });
      test422ErrorFallback(error);
    });

    it('should handle 422 error with null error.error.id', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: { id: null },
        statusText: 'Validation error occurred',
      });
      test422ErrorFallback(error);
    });

    it('should handle 422 error with no error.error object', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: null,
        statusText: 'Server validation error',
      });
      test422ErrorFallback(error);
    });

    it('should handle 422 error with empty string error.error.id', () => {
      const error = new HttpErrorResponse({
        status: 422,
        error: { id: '' },
        statusText: 'Empty error ID',
      });
      test422ErrorFallback(error);
    });

    function test422ErrorHandling(errorId: string, expectedTranslationKey: string, translatedMessage: string) {
      const error = new HttpErrorResponse({
        status: 422,
        error: { id: errorId },
      });
      const apiName = OrderingApiName.GetCurrentOrdersList;

      generateTranslationKeySpy.mockReturnValue(expectedTranslationKey);
      translationsServiceSpy.translate.mockReturnValue(translatedMessage);

      service.handleError(error, apiName);

      expect(generateTranslationKeySpy).toHaveBeenCalledWith(errorId, 'msgError', '-');
      expect(translationsServiceSpy.translate).toHaveBeenCalledWith(expectedTranslationKey);
      expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith(translatedMessage, expect.any(Object));
    }

    it('should handle 422 error with complex error ID containing multiple hyphens', () => {
      test422ErrorHandling(
        'train-path-validation-failed-schedule-conflict',
        'msgErrorTrainPathValidationFailedScheduleConflict',
        'Train path validation failed due to schedule conflict',
      );
    });

    it('should verify that 422 error handling returns early and does not proceed to other error handling logic', () => {
      const errorId = 'validation-error';
      const error = new HttpErrorResponse({
        status: 422,
        error: { id: errorId },
      });
      const apiName = OrderingApiName.GetCurrentOrdersList;
      const expectedTranslationKey = 'msgErrorValidationError';
      const translatedMessage = 'Validation error';

      generateTranslationKeySpy.mockReturnValue(expectedTranslationKey);
      translationsServiceSpy.translate.mockReturnValue(translatedMessage);

      service.handleError(error, apiName);

      // Should call generateTranslationKey and translate for 422 error
      expect(generateTranslationKeySpy).toHaveBeenCalledWith(errorId, 'msgError', '-');
      expect(translationsServiceSpy.translate).toHaveBeenCalledWith(expectedTranslationKey);
      expect(notificationServiceSpy.pushNotification).toHaveBeenCalledWith(translatedMessage, expect.any(Object));

      // Should not call translate for any default error messages since it returns early
      expect(translationsServiceSpy.translate).toHaveBeenCalledTimes(1);
    });
  });
});

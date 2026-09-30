import { TestBed } from '@angular/core/testing';

import { SlotErrorBoundaryComponent } from './slot-error-boundary.component';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';

describe('SlotErrorBoundaryComponent', () => {
  let component: SlotErrorBoundaryComponent;
  let errorHandlingServiceMock: any;

  beforeEach(() => {
    errorHandlingServiceMock = { handleError: jest.fn() };

    TestBed.configureTestingModule({
      imports: [SlotErrorBoundaryComponent],
      providers: [
        { provide: ErrorHandlingService, useValue: errorHandlingServiceMock },
        { provide: TranslationsService, useValue: { translate: jest.fn((key: string) => key) } },
      ],
    });

    const fixture = TestBed.createComponent(SlotErrorBoundaryComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(component).toBeTruthy();
  });

  it('should not show error state initially', () => {
    expect(component['hasError']()).toBe(false);
  });

  describe('handleError', () => {
    it('should set hasError to true and forward to ErrorHandlingService', () => {
      const testError = new Error('test error');

      component.handleError(testError);

      expect(component['hasError']()).toBe(true);
      expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(testError, expect.any(String));
    });

    it('should handle multiple errors without throwing', () => {
      component.handleError(new Error('first'));
      component.handleError(new Error('second'));

      expect(component['hasError']()).toBe(true);
      expect(errorHandlingServiceMock.handleError).toHaveBeenCalledTimes(2);
    });
  });
});

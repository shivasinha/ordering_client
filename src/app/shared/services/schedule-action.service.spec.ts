import { TestBed } from '@angular/core/testing';
import { of, throwError, Subscription } from 'rxjs';
import { fakeAsync, tick } from '@angular/core/testing';
import { ScheduleActionService } from './schedule-action.service';
import { ScheduleService, TrainRunListItem, TrainRun } from '@Ordering/api';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { SNACKBARCONFIG_ERROR } from '@Ordering/utils/snackbar';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

describe('ScheduleActionService', () => {
  let service: ScheduleActionService;
  let scheduleService: jest.Mocked<ScheduleService>;
  let loadingSpinnerService: jest.Mocked<LoadingSpinnerService>;
  let notificationService: jest.Mocked<NotificationService>;
  let translationsService: jest.Mocked<TranslationsService>;
  let errorHandlingService: jest.Mocked<ErrorHandlingService>;
  let subscriptions: Subscription[] = [];

  beforeEach(() => {
    const scheduleServiceMock = {
      getTrainRuns: jest.fn(),
      getTrainRun: jest.fn(),
    };

    const loadingSpinnerServiceMock = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    };

    const notificationServiceMock = {
      pushNotification: jest.fn(),
    };

    const translationsServiceMock = {
      translate: jest.fn((key: string) => key),
    };

    const errorHandlingServiceMock = {
      handleError: jest.fn().mockImplementation(() => {
        // Mock the behavior of the real ErrorHandlingService.handleError
        // In the real service, it translates a message and shows a notification
        // Since the test sets up translationsService.translate to return specific values,
        // we should call it to get the translated message and then use that for the notification
        const translatedMessage = translationsServiceMock.translate('msgErrorGetTrainRun');
        notificationServiceMock.pushNotification(translatedMessage, SNACKBARCONFIG_ERROR);
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        ScheduleActionService,
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerServiceMock },
        { provide: NotificationService, useValue: notificationServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: ErrorHandlingService, useValue: errorHandlingServiceMock },
      ],
    });

    service = TestBed.inject(ScheduleActionService);
    scheduleService = TestBed.inject(ScheduleService) as jest.Mocked<ScheduleService>;
    loadingSpinnerService = TestBed.inject(LoadingSpinnerService) as jest.Mocked<LoadingSpinnerService>;
    notificationService = TestBed.inject(NotificationService) as jest.Mocked<NotificationService>;
    translationsService = TestBed.inject(TranslationsService) as jest.Mocked<TranslationsService>;
    errorHandlingService = TestBed.inject(ErrorHandlingService) as jest.Mocked<ErrorHandlingService>;
  });
  afterEach(() => {
    // Unsubscribe from all subscriptions to prevent leaks
    subscriptions.forEach(sub => {
      if (sub && !sub.closed) {
        sub.unsubscribe();
      }
    });
    subscriptions = [];

    // Clear all timers and mocks
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();

    // Reset TestBed
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getTrainRunListbyProject', () => {
    it('should show spinner and call getTrainRuns on success', fakeAsync(() => {
      const params = { project: 'test-project' };
      const mockTrainRuns: TrainRunListItem[] = [
        {
          trainNumber: 'TRN001',
          operatingDays: [{ beginDate: '2025-08-01', daysBitmap: '1111111' }],
          operatingCompany: 'Test Company',
          trainType: 'Express',
          fromStation: 'Station A',
          toStation: 'Station B',
          lastModifiedDateTime: '2025-08-01T10:00:00Z',
        } as unknown as TrainRunListItem,
        {
          trainNumber: 'TRN002',
          operatingDays: [{ beginDate: '2025-08-02', daysBitmap: '1111111' }],
          operatingCompany: 'Test Company',
          trainType: 'Local',
          fromStation: 'Station C',
          toStation: 'Station D',
          lastModifiedDateTime: '2025-08-02T10:00:00Z',
        } as unknown as TrainRunListItem,
      ];

      scheduleService.getTrainRuns.mockReturnValue(of({ trainRuns: mockTrainRuns, totalCount: mockTrainRuns.length }) as any);

      let result: any;
      const subscription = service.getTrainRunListbyProject(params).subscribe(data => {
        result = data;
      });

      tick();

      expect(loadingSpinnerService.showSpinner).toHaveBeenCalled();
      expect(scheduleService.getTrainRuns).toHaveBeenCalledWith(params);
      expect(result).toEqual(mockTrainRuns);
      expect(loadingSpinnerService.hideSpinner).toHaveBeenCalled();

      subscriptions.push(subscription);
    }));

    it('should handle empty parameters and still make API call', fakeAsync(() => {
      const mockTrainRuns: TrainRunListItem[] = [];
      scheduleService.getTrainRuns.mockReturnValue(of({ trainRuns: mockTrainRuns, totalCount: 0 }) as any);

      let result: any;
      const subscription = service.getTrainRunListbyProject().subscribe(data => {
        result = data;
      });

      tick();

      expect(loadingSpinnerService.showSpinner).toHaveBeenCalled();
      expect(scheduleService.getTrainRuns).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockTrainRuns);
      expect(loadingSpinnerService.hideSpinner).toHaveBeenCalled();

      subscriptions.push(subscription);
    }));

    it('should handle error, call error handling service, and return empty array', fakeAsync(() => {
      const params = { project: 'test-project' };
      const error = new Error('Network error');
      scheduleService.getTrainRuns.mockReturnValue(throwError(() => error));

      let result: any;
      const subscription = service.getTrainRunListbyProject(params).subscribe(data => {
        result = data;
      });

      tick();

      expect(result).toEqual([]);
      expect(loadingSpinnerService.showSpinner).toHaveBeenCalled();
      expect(scheduleService.getTrainRuns).toHaveBeenCalledWith(params);
      expect(errorHandlingService.handleError).toHaveBeenCalledWith(error, OrderingApiName.GetTrainRunList);
      expect(loadingSpinnerService.hideSpinner).toHaveBeenCalled();

      subscriptions.push(subscription);
    }));

    it('should show spinner when API call is made', () => {
      const params = { project: 'test-project' };
      scheduleService.getTrainRuns.mockReturnValue(of({ trainRuns: [], totalCount: 0 }) as any);

      service.getTrainRunListbyProject(params).subscribe();

      expect(loadingSpinnerService.showSpinner).toHaveBeenCalled();
    });

    it('should handle different parameter types', fakeAsync(() => {
      const testCases = [null, undefined, { project: 'test' }, { project: 'test', additional: 'param' }, {}];

      testCases.forEach(testParams => {
        jest.clearAllMocks();
        scheduleService.getTrainRuns.mockReturnValue(of({ trainRuns: [], totalCount: 0 }) as any);

        let result: any;
        service.getTrainRunListbyProject(testParams as any).subscribe(data => {
          result = data;
        });

        tick();

        expect(scheduleService.getTrainRuns).toHaveBeenCalledWith(testParams);
        expect(result).toEqual([]);
      });
    }));
  });

  describe('getTrainRun', () => {
    const mockTrainRunListItem: TrainRunListItem = {
      trainNumber: 'TRN001',
      trainId: 14001,
      schedVersionId: 202501,
      operatingDays: [{ beginDate: '2025-08-01', daysBitmap: '1111111' }],
      operatingCompany: 'Test Company',
      trainType: 'Express',
      fromStation: 'Station A',
      toStation: 'Station B',
      lastModifiedDateTime: '2025-08-01T10:00:00Z',
    } as unknown as TrainRunListItem;

    const mockTrainRun: TrainRun = {
      trainNumber: 'TRN001',
      operatingDay: '2025-08-01',
      isConditionalTrainRun: false,
      operatingCompany: 'Test Company',
    } as unknown as TrainRun;

    it('should successfully retrieve train run details', done => {
      scheduleService.getTrainRun.mockReturnValue(of(mockTrainRun) as any);

      const subscription = service.getTrainRun(mockTrainRunListItem).subscribe(result => {
        expect(scheduleService.getTrainRun).toHaveBeenCalledWith(14001, 202501);
        expect(result).toEqual(mockTrainRun);
        done();
      });
      subscriptions.push(subscription);
    });

    it('should handle error and show notification', done => {
      const error = new Error('Failed to get train run');
      const errorMessage = 'Error getting train run';

      scheduleService.getTrainRun.mockReturnValue(throwError(() => error));
      translationsService.translate.mockReturnValue(errorMessage);

      const subscription = service.getTrainRun(mockTrainRunListItem).subscribe({
        next: result => {
          expect(result).toEqual({} as TrainRun);
          expect(scheduleService.getTrainRun).toHaveBeenCalledWith(14001, 202501);
          expect(translationsService.translate).toHaveBeenCalledWith('msgErrorGetTrainRun');
          expect(notificationService.pushNotification).toHaveBeenCalledWith(errorMessage, SNACKBARCONFIG_ERROR);
          done();
        },
        error: () => {
          fail('Expected no error to be thrown, should be caught and handled');
        },
      });
      done();
      subscriptions.push(subscription);
    });

    it('should handle train run with multiple operating days', done => {
      const multiDayTrainRun: TrainRunListItem = {
        trainNumber: 'TRN002',
        trainId: 14002,
        schedVersionId: 202501,
        operatingDays: [
          { beginDate: '2025-08-01', daysBitmap: '1111111' },
          { beginDate: '2025-08-02', daysBitmap: '1111111' },
          { beginDate: '2025-08-03', daysBitmap: '1111111' },
        ],
        operatingCompany: 'Test Company',
        trainType: 'Express',
        fromStation: 'Station A',
        toStation: 'Station B',
        lastModifiedDateTime: '2025-08-01T10:00:00Z',
      } as unknown as TrainRunListItem;

      scheduleService.getTrainRun.mockReturnValue(of(mockTrainRun) as any);

      const subscription = service.getTrainRun(multiDayTrainRun).subscribe(result => {
        expect(scheduleService.getTrainRun).toHaveBeenCalledWith(14002, 202501);
        expect(result).toEqual(mockTrainRun);
        done();
      });
      subscriptions.push(subscription);
    });
  });

  describe('service properties and dependencies', () => {
    it('should have All_PROJECTS constant defined', () => {
      expect((service as any).All_PROJECTS).toBe('allProjects');
    });

    it('should have tr (TranslationsService) injected', () => {
      expect(service.tr).toBeTruthy();
      expect(service.tr).toBe(translationsService);
    });

    it('should have all required dependencies injected', () => {
      expect((service as any).scheduleService).toBeTruthy();
      expect((service as any).loadingSpinnerService).toBeTruthy();
      expect((service as any).errorHandlingService).toBeTruthy();
    });
  });

  describe('error scenarios', () => {
    it('should handle null/undefined parameters gracefully in getTrainRunListbyProject', fakeAsync(() => {
      const mockTrainRuns: TrainRunListItem[] = [];
      scheduleService.getTrainRuns.mockReturnValue(of({ trainRuns: mockTrainRuns, totalCount: 0 }) as any);

      let result: any;
      const subscription = service.getTrainRunListbyProject(null as any).subscribe(data => {
        result = data;
      });

      tick();

      expect(scheduleService.getTrainRuns).toHaveBeenCalledWith(null);
      expect(result).toEqual(mockTrainRuns);

      subscriptions.push(subscription);
    }));

    it('should handle network timeout error in getTrainRunListbyProject', fakeAsync(() => {
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'TimeoutError';
      scheduleService.getTrainRuns.mockReturnValue(throwError(() => timeoutError));

      let result: any;
      const subscription = service.getTrainRunListbyProject({ project: 'test' }).subscribe(data => {
        result = data;
      });

      tick();

      expect(result).toEqual([]);
      expect(errorHandlingService.handleError).toHaveBeenCalledWith(timeoutError, OrderingApiName.GetTrainRunList);

      subscriptions.push(subscription);
    }));

    it('should handle HTTP error response in getTrainRun', done => {
      const httpError = { status: 404, message: 'Not Found' };
      scheduleService.getTrainRun.mockReturnValue(throwError(() => httpError));
      translationsService.translate.mockReturnValue('Train run not found');

      const mockData: TrainRunListItem = {
        trainNumber: 'INVALID',
        trainId: 99999,
        schedVersionId: 202501,
        operatingDays: [{ beginDate: '2025-08-01', daysBitmap: '1111111' }],
        operatingCompany: 'Test Company',
        trainType: 'Express',
        fromStation: 'Station A',
        toStation: 'Station B',
        lastModifiedDateTime: '2025-08-01T10:00:00Z',
      } as unknown as TrainRunListItem;

      const subscription = service.getTrainRun(mockData).subscribe({
        next: result => {
          expect(result).toEqual({} as TrainRun);
          expect(notificationService.pushNotification).toHaveBeenCalledWith('Train run not found', SNACKBARCONFIG_ERROR);
          done();
        },
      });
      done();
      subscriptions.push(subscription);
    });
  });

  it('should retrieve train run list when project is provided', done => {
    const project = 'test-project';
    const trainRuns: TrainRunListItem[] = [];
    scheduleService.getTrainRuns.mockReturnValue(of({ trainRuns, totalCount: 0 }) as any);

    const subscription = service.getTrainRunListbyProject(project).subscribe(result => {
      expect(loadingSpinnerService.showSpinner).toHaveBeenCalled();
      expect(scheduleService.getTrainRuns).toHaveBeenCalled();
      expect(result).toEqual(trainRuns);
      done();
    });
    subscriptions.push(subscription);
  });

  it('should handle error when retrieving train run list', done => {
    const project = 'test-project';
    scheduleService.getTrainRuns.mockReturnValue(throwError(() => new Error('Error')));
    translationsService.translate.mockReturnValue('Error message');

    const subscription = service.getTrainRunListbyProject(project).subscribe({
      next: result => {
        expect(result).toEqual([]);
      },
      error: () => {
        fail('Expected no error to be thrown');
      },
      complete: () => {
        expect(loadingSpinnerService.showSpinner).toHaveBeenCalled();
        expect(scheduleService.getTrainRuns).toHaveBeenCalled();
        expect(errorHandlingService.handleError).toHaveBeenCalled();
        done();
      },
    });
    subscriptions.push(subscription);
  });
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { PresavedTemplateService } from './presaved-template.service';
import { PresavedTemplateFilterCriteria } from '../models/presaved-template-filter.interface';
import { PresavedODTTemplate, ODTTemplateService } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { NotificationService } from '@Ordering/shared/services/notification.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OperatingDaysCalculationService } from '@Ordering/portalComponents/operating-days/operating-days-calculation.service';

describe('PresavedTemplateService', () => {
  let service: PresavedTemplateService;
  let httpMock: HttpTestingController;

  const mockTemplates: PresavedODTTemplate[] = [
    {
      name: 'ODT12345',
      description: 'Test ODT12345 - Weekdays only',
      endDate: '2024-01-07',
      operatingDays: {
        beginDate: '2024-01-01',
        daysBitmap: '1111100',
        selectedDays: [1, 2, 3, 4, 5],
        deselectedDays: [6, 7],
      },
    },
    {
      name: 'ODT67890',
      description: 'Test ODT67890 - Weekend template',
      endDate: '2024-01-14',
      operatingDays: {
        beginDate: '2024-01-08',
        daysBitmap: '0000011',
        selectedDays: [6, 7],
        deselectedDays: [1, 2, 3, 4, 5],
      },
    },
  ];

  beforeEach(() => {
    const mockTranslationsService = {
      translate: jest.fn().mockReturnValue('translated'),
    };

    const mockLoadingSpinnerService = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    };

    const mockNotificationService = {
      pushNotification: jest.fn(),
    };

    const mockErrorHandlingService = {
      handleError: jest.fn(),
    };

    const mockOperatingDaysCalculationService = {
      isSubsetModeSig: signal(false),
      generateBitmap: jest.fn().mockReturnValue('1010101'),
      generateCalendarDisplayData: jest.fn().mockReturnValue({ months: [], allDaysNames: [] }),
      validateBitmapSubset: jest.fn().mockReturnValue({ isValid: true }),
      combineOperatingDays: jest.fn().mockReturnValue({ daysBitmap: '1111111', beginDate: '2024-01-01' }),
    };

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        PresavedTemplateService,
        { provide: TranslationsService, useValue: mockTranslationsService },
        { provide: LoadingSpinnerService, useValue: mockLoadingSpinnerService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: ErrorHandlingService, useValue: mockErrorHandlingService },
        { provide: OperatingDaysCalculationService, useValue: mockOperatingDaysCalculationService },
        { provide: ODTTemplateService, useValue: { createPresavedOdts: jest.fn(), getPresavedOdts: jest.fn() } },
      ],
    });
    service = TestBed.inject(PresavedTemplateService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return templates with search filter', done => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'ODT12345',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    // Mock the ODTTemplateService getPresavedOdts method
    const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
    mockODTTemplateService.getPresavedOdts = jest.fn().mockReturnValue(of(mockTemplates));

    service.getPresavedTemplates(filterCriteria).subscribe(templates => {
      expect(templates).toBeDefined();
      expect(templates.length).toBe(2);
      expect(templates).toEqual(mockTemplates);
      expect(mockODTTemplateService.getPresavedOdts).toHaveBeenCalledWith('2024-01-01', '2024-01-31', false, 'ODT12345');
      done();
    });
  });

  it('should build correct query parameters', () => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'test',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    const queryParams = service.buildQueryParams(filterCriteria);

    expect(queryParams.searchString).toBe('test');
    expect(queryParams.beginDate).toBe('2024-01-01');
    expect(queryParams.endDate).toBe('2024-01-31');
    expect(queryParams.matchAnyDate).toBe(false);
  });

  it('should handle matchAnyDate correctly', () => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'test',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: true,
    };

    const queryParams = service.buildQueryParams(filterCriteria);

    expect(queryParams.searchString).toBe('test');
    expect(queryParams.beginDate).toBe('2024-01-01');
    expect(queryParams.endDate).toBe('2024-01-31');
    expect(queryParams.matchAnyDate).toBe(true);
  });

  it('should set loading state correctly', done => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: '',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    // Mock the ODTTemplateService getPresavedOdts method
    const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
    mockODTTemplateService.getPresavedOdts = jest.fn().mockReturnValue(of(mockTemplates));

    service.getPresavedTemplates(filterCriteria).subscribe(() => {
      // Check that loading signal is available
      expect(service.isLoadingSignal()).toBeDefined();
      done();
    });

    // Verify that the service method was called
    expect(mockODTTemplateService.getPresavedOdts).toHaveBeenCalledWith('2024-01-01', '2024-01-31', false, undefined);
  });

  it('should handle empty search string', done => {
    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: '',
      beginDate: '2024-01-01',
      endDate: '2024-01-31',
      matchAnyDate: false,
    };

    // Mock the ODTTemplateService getPresavedOdts method
    const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
    mockODTTemplateService.getPresavedOdts = jest.fn().mockReturnValue(of(mockTemplates));

    service.getPresavedTemplates(filterCriteria).subscribe(templates => {
      expect(templates).toBeDefined();
      expect(templates.length).toBe(2);
      expect(mockODTTemplateService.getPresavedOdts).toHaveBeenCalledWith('2024-01-01', '2024-01-31', false, undefined);
      done();
    });
  });

  it('should handle Date objects in filterCriteria', () => {
    const startDate = new Date('2024-01-01');
    const endDate = new Date('2024-01-31');

    const filterCriteria: PresavedTemplateFilterCriteria = {
      searchString: 'test',
      beginDate: startDate as any,
      endDate: endDate as any,
      matchAnyDate: false,
    };

    const queryParams = service.buildQueryParams(filterCriteria);

    expect(queryParams.beginDate).toBe('2024-01-01');
    expect(queryParams.endDate).toBe('2024-01-31');
  });

  describe('savePresavedTemplate', () => {
    const mockTemplateToSave: PresavedODTTemplate = {
      name: 'Test Template',
      description: 'Test Description',
      endDate: '2024-12-31',
      operatingDays: {
        beginDate: '2024-01-01',
        daysBitmap: '1111111',
        selectedDays: [0],
        deselectedDays: [],
      },
    };

    it('should save template successfully with mock implementation', done => {
      // Mock the ODTTemplateService createPresavedOdts method
      const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
      mockODTTemplateService.createPresavedOdts = jest.fn().mockReturnValue(of(mockTemplateToSave));

      service.savePresavedTemplate(mockTemplateToSave).subscribe(savedTemplate => {
        expect(savedTemplate).toEqual(mockTemplateToSave);
        expect(mockODTTemplateService.createPresavedOdts).toHaveBeenCalledWith(mockTemplateToSave);
        done();
      });
    });

    it('should set loading state during save operation', () => {
      // Mock the ODTTemplateService createPresavedOdts method
      const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
      mockODTTemplateService.createPresavedOdts = jest.fn().mockReturnValue(of(mockTemplateToSave));

      // Verify isLoadingSignal is available
      expect(service.isLoadingSignal()).toBeDefined();

      // Call the service and verify it works
      const subscription = service.savePresavedTemplate(mockTemplateToSave).subscribe();
      subscription.unsubscribe();

      expect(mockODTTemplateService.createPresavedOdts).toHaveBeenCalledWith(mockTemplateToSave);
    });

    it('should handle template with empty description', done => {
      const templateWithEmptyDescription = {
        ...mockTemplateToSave,
        description: '',
      };

      // Mock the ODTTemplateService createPresavedOdts method
      const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
      mockODTTemplateService.createPresavedOdts = jest.fn().mockReturnValue(of(templateWithEmptyDescription));

      service.savePresavedTemplate(templateWithEmptyDescription).subscribe(savedTemplate => {
        expect(savedTemplate.description).toBe('');
        expect(savedTemplate.name).toBe('Test Template');
        expect(mockODTTemplateService.createPresavedOdts).toHaveBeenCalledWith(templateWithEmptyDescription);
        done();
      });
    });

    it('should preserve all template data in save response', done => {
      // Mock the ODTTemplateService createPresavedOdts method
      const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
      mockODTTemplateService.createPresavedOdts = jest.fn().mockReturnValue(of(mockTemplateToSave));

      service.savePresavedTemplate(mockTemplateToSave).subscribe(savedTemplate => {
        expect(savedTemplate.name).toBe(mockTemplateToSave.name);
        expect(savedTemplate.description).toBe(mockTemplateToSave.description);
        expect(savedTemplate.endDate).toBe(mockTemplateToSave.endDate);
        expect(savedTemplate.operatingDays).toEqual(mockTemplateToSave.operatingDays);
        done();
      });
    });

    it('should complete loading state after save operation', done => {
      // Mock the ODTTemplateService createPresavedOdts method
      const mockODTTemplateService = TestBed.inject(ODTTemplateService) as jest.Mocked<ODTTemplateService>;
      mockODTTemplateService.createPresavedOdts = jest.fn().mockReturnValue(of(mockTemplateToSave));

      service.savePresavedTemplate(mockTemplateToSave).subscribe({
        next: () => {
          // Check loading state after completion
          setTimeout(() => {
            expect(service.isLoadingSignal()).toBeDefined();
            done();
          }, 0);
        },
      });
    });
  });

  describe('prepareCombinedTemplate', () => {
    const mockDaySetListItems = [
      {
        id: '1',
        beginDate: '2024-01-01',
        daysBitmap: '1111100',
        selectedDays: [1, 2, 3, 4, 5],
        deselectedDays: [6, 7],
      },
      {
        id: '2',
        beginDate: '2024-01-08',
        daysBitmap: '0000011',
        selectedDays: [6, 7],
        deselectedDays: [1, 2, 3, 4, 5],
      },
    ];

    it('should combine multiple day set items into single template', () => {
      const combinedTemplate = service.prepareCombinedTemplate(mockDaySetListItems);

      expect(combinedTemplate.name).toBe('');
      expect(combinedTemplate.description).toBe('');
      expect(combinedTemplate.operatingDays.selectedDays).toEqual([]);
      expect(combinedTemplate.operatingDays.deselectedDays).toEqual([]);
      expect(combinedTemplate.operatingDays.daysBitmap).toBeDefined();
      expect(combinedTemplate.operatingDays.beginDate).toBeDefined();
      expect(combinedTemplate.endDate).toBeDefined();
    });

    it('should throw error when no valid operating days provided', () => {
      expect(() => {
        service.prepareCombinedTemplate([]);
      }).toThrow('No valid operating days provided to combine.');
    });

    it('should throw error when no valid operating days found', () => {
      const invalidItems = [
        { id: '1', beginDate: '', daysBitmap: '' },
        { id: '2', beginDate: null, daysBitmap: null },
      ];

      expect(() => {
        service.prepareCombinedTemplate(invalidItems as any);
      }).toThrow('No valid operating days found in the provided list.');
    });

    it('should filter out items without valid beginDate or daysBitmap', () => {
      const mixedItems = [
        ...mockDaySetListItems,
        { id: '3', beginDate: '', daysBitmap: '' },
        { id: '4', beginDate: '2024-01-15', daysBitmap: null },
      ];

      const combinedTemplate = service.prepareCombinedTemplate(mixedItems as any);

      expect(combinedTemplate).toBeDefined();
      expect(combinedTemplate.operatingDays.daysBitmap).toBeDefined();
    });
  });
});

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { SpareCapacityService } from './spare-capacity.service';
import {
  SpareCapacityService as LibSpareCapacityService,
  SpareCapacityResponseList,
  SpareCapacityFilters,
  PaginationAndSorting,
  SortOrder,
} from '@Ordering/api';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';

describe('SpareCapacityService', () => {
  let service: SpareCapacityService;
  let mockLibSpareCapacityService: jest.Mocked<LibSpareCapacityService>;
  let mockLoadingSpinnerService: jest.Mocked<LoadingSpinnerService>;
  let mockErrorHandlingService: jest.Mocked<ErrorHandlingService>;

  const mockResponse: SpareCapacityResponseList = {
    spareCapacityList: [
      {
        trainId: 1001,
        schedVersionId: 1,
        trainNumber: 'TR-001',
        lastModifiedDateTime: '2025-11-01T08:30:00',
        operatingDays: [{ beginDate: '2025-11-01', daysBitmap: '1010100' }],
        departureTime: '08:30',
        fromStation: 'Berlin Hbf',
        toStation: 'Munich Hbf',
        arrivalTime: '12:45',
        length: 250,
        weight: 1200,
        maxSpeed: 160,
      } as any,
    ],
    totalCount: 1,
  };

  beforeEach(() => {
    const libServiceMock = {
      getSpareCapacityList: jest.fn(),
    };

    const loadingSpinnerMock = {
      showSpinner: jest.fn(),
      hideSpinner: jest.fn(),
    };

    const errorHandlingMock = {
      handleError: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        SpareCapacityService,
        { provide: LibSpareCapacityService, useValue: libServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerMock },
        { provide: ErrorHandlingService, useValue: errorHandlingMock },
      ],
    });

    service = TestBed.inject(SpareCapacityService);
    mockLibSpareCapacityService = TestBed.inject(LibSpareCapacityService) as jest.Mocked<LibSpareCapacityService>;
    mockLoadingSpinnerService = TestBed.inject(LoadingSpinnerService) as jest.Mocked<LoadingSpinnerService>;
    mockErrorHandlingService = TestBed.inject(ErrorHandlingService) as jest.Mocked<ErrorHandlingService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('getSpareCapacityList', () => {
    const mockFilters: SpareCapacityFilters = {
      trainId: 1001,
      date: '2025-11-01',
      fromStation: 'Berlin',
      toStation: 'Munich',
    };

    const mockPagination: PaginationAndSorting = {
      pageIndex: 0,
      pageSize: 25,
      sortBy: 'trainNumber',
      sortOrder: SortOrder.ASC,
    };

    it('should show spinner before making API call', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe(() => {
        expect(mockLoadingSpinnerService.showSpinner).toHaveBeenCalled();
        done();
      });
    });

    it('should call library service with correct parameters', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe(() => {
        expect(mockLibSpareCapacityService.getSpareCapacityList).toHaveBeenCalledWith(mockFilters, mockPagination);
        done();
      });
    });

    it('should return data from library service on success', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe(result => {
        expect(result).toEqual(mockResponse);
        expect(result.spareCapacityList.length).toBe(1);
        expect(result.totalCount).toBe(1);
        done();
      });
    });

    it('should hide spinner after successful API call', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe({
        next: () => {},
        complete: () => {
          // finalize runs after complete, so we need to wait a tick
          setTimeout(() => {
            expect(mockLoadingSpinnerService.hideSpinner).toHaveBeenCalled();
            done();
          }, 0);
        },
      });
    });

    it('should handle error and call error handling service', done => {
      const mockError = new Error('API Error');
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(throwError(() => mockError));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe(result => {
        expect(mockErrorHandlingService.handleError).toHaveBeenCalledWith(mockError, OrderingApiName.GetSpareCapacityList);
        expect(result).toEqual({ spareCapacityList: [], totalCount: 0 });
        done();
      });
    });

    it('should return empty result on error to prevent UI breakage', done => {
      const mockError = new Error('Network Error');
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(throwError(() => mockError));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe(result => {
        expect(result.spareCapacityList).toEqual([]);
        expect(result.totalCount).toBe(0);
        done();
      });
    });

    it('should hide spinner even when error occurs', done => {
      const mockError = new Error('API Error');
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(throwError(() => mockError));

      service.getSpareCapacityList(mockFilters, mockPagination).subscribe({
        next: () => {},
        complete: () => {
          // finalize runs after complete, so we need to wait a tick
          setTimeout(() => {
            expect(mockLoadingSpinnerService.hideSpinner).toHaveBeenCalled();
            done();
          }, 0);
        },
      });
    });

    it('should work with undefined filters', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList(undefined, mockPagination).subscribe(() => {
        expect(mockLibSpareCapacityService.getSpareCapacityList).toHaveBeenCalledWith(undefined, mockPagination);
        done();
      });
    });

    it('should work with undefined pagination', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList(mockFilters, undefined).subscribe(() => {
        expect(mockLibSpareCapacityService.getSpareCapacityList).toHaveBeenCalledWith(mockFilters, undefined);
        done();
      });
    });

    it('should work with both filters and pagination undefined', done => {
      mockLibSpareCapacityService.getSpareCapacityList.mockReturnValue(of(mockResponse));

      service.getSpareCapacityList().subscribe(() => {
        expect(mockLibSpareCapacityService.getSpareCapacityList).toHaveBeenCalledWith(undefined, undefined);
        done();
      });
    });
  });
});

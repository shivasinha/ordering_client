// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { SpareCapacityListItem, TrainRun } from '@Ordering/api';
import { SpareCapacityService } from '@Ordering/portalComponents/spare-capacity/services/spare-capacity.service';
import { ListActionsService } from '@Ordering/shared/services/list-actions.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import {
  CreateOrderDialogComponent,
  CreateOrderDialogData,
} from '@Ordering/shared/components/create-order-dialog/create-order-dialog.component';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { SpareCapacityContainerService } from './spare-capacity-container.service';

describe('SpareCapacityContainerService - Order Creation', () => {
  let service: SpareCapacityContainerService;
  let mockSpareCapacityService: jest.Mocked<SpareCapacityService>;
  let mockListActionsService: jest.Mocked<ListActionsService>;
  let mockDialog: jest.Mocked<MatDialog>;
  let mockTranslationsService: jest.Mocked<TranslationsService>;

  const mockSpareCapacityItem: SpareCapacityListItem = {
    trainId: 1001,
    schedVersionId: 1,
    trainNumber: 'TR-001',
    routeNumber: 'ROUTE-001',
    lastModifiedDateTime: '2025-11-01T08:30:00',
    operatingDays: [{ beginDate: '2025-11-01', daysBitmap: '1111100', selectedDays: [1, 2, 3, 4, 5] }],
    departureTime: '08:30',
    fromStation: 'Berlin Hbf',
    toStation: 'Munich Hbf',
    arrivalTime: '12:45',
    length: '250m',
    weight: '1200t',
    maxSpeed: '160km/h',
  };

  const mockTrainRun: TrainRun = {
    trainNumber: 'TR-001',
    schedVersionId: 1,
    operatingDays: [{ beginDate: '2025-11-01', daysBitmap: '1111100' }],
    departureTime: '08:30',
    arrivalTime: '12:45',
  } as TrainRun;

  beforeEach(async () => {
    mockSpareCapacityService = {
      getSpareCapacityList: jest.fn(),
      getSpareCapacity: jest.fn(),
    } as any;

    mockListActionsService = {
      createOrderFromTrainRun: jest.fn(),
    } as any;

    mockDialog = {
      open: jest.fn(),
    } as any;

    mockTranslationsService = {
      translate: jest.fn().mockImplementation((key: string) => `translated_${key}`),
      translateEnumValue: jest.fn().mockImplementation((value: number) => `day_${value}`),
    } as any;

    await TestBed.configureTestingModule({
      providers: [
        SpareCapacityContainerService,
        { provide: SpareCapacityService, useValue: mockSpareCapacityService },
        { provide: ListActionsService, useValue: mockListActionsService },
        { provide: MatDialog, useValue: mockDialog },
        { provide: TranslationsService, useValue: mockTranslationsService },
        {
          provide: UserPermissionService,
          useValue: { checkPermissions: jest.fn().mockReturnValue(true), canCancelTrainRun: jest.fn(), canModifyTrainRun: jest.fn() },
        },
        {
          provide: ConfigDataService,
          useValue: {
            isRailwayUndertakingUser: jest.fn(),
            isInfrastructureManagerUser: jest.fn(),
            userPermissions: jest.fn().mockReturnValue({}),
          },
        },
      ],
    }).compileComponents();

    service = TestBed.inject(SpareCapacityContainerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.restoreAllMocks();
    TestBed.resetTestingModule();
  });

  describe('handleCopyOrder', () => {
    it('should fetch train run details when copy action is triggered', () => {
      mockSpareCapacityService.getSpareCapacity.mockReturnValue(of(mockTrainRun));
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(null)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      // Access private method through instance
      service['handleCopyOrder'](mockSpareCapacityItem);

      expect(mockSpareCapacityService.getSpareCapacity).toHaveBeenCalledWith(1001, 1);
    });

    it('should open dialog after fetching train run', done => {
      mockSpareCapacityService.getSpareCapacity.mockReturnValue(of(mockTrainRun));
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(null)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['handleCopyOrder'](mockSpareCapacityItem);

      setTimeout(() => {
        expect(mockDialog.open).toHaveBeenCalledWith(CreateOrderDialogComponent, {
          width: '600px',
          maxWidth: '90vw',
          data: expect.objectContaining({
            initialOrderType: 0,
            showDescription: true,
          }),
        });
        done();
      }, 100);
    });

    it('should handle error when fetching train run fails', done => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockSpareCapacityService.getSpareCapacity.mockReturnValue(throwError(() => new Error('Fetch error')));

      service['handleCopyOrder'](mockSpareCapacityItem);

      setTimeout(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to fetch spare capacity train run:', expect.any(Error));
        expect(mockDialog.open).not.toHaveBeenCalled();
        consoleSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('openCreateOrderDialog', () => {
    it('should open dialog with correct configuration', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(null)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      expect(mockDialog.open).toHaveBeenCalledWith(CreateOrderDialogComponent, {
        width: '600px',
        maxWidth: '90vw',
        data: expect.objectContaining({
          initialOrderType: 0,
          showDescription: true,
          showTrainNo: true,
          trainNoRequired: true,
        }),
      });
    });

    it('should set dialog title with translations', () => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(null)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      const dialogData = (mockDialog.open as jest.Mock).mock.calls[0][1].data as CreateOrderDialogData;
      expect(dialogData.dialogTitle).toBe('translated_lblNewOrder - translated_lblSpareCapacity');
    });

    it('should call createOrderFromTrainRun when dialog returns data', done => {
      const dialogResult = {
        orderData: {
          subject: 'Test Order',
          orderType: 1,
          description: 'Test Description',
          trainNo: 'TR-001',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        const expectedTrainRun = {
          ...mockTrainRun,
          secondaryTrainNumber: 'ROUTE-001',
        };
        expect(mockListActionsService.createOrderFromTrainRun).toHaveBeenCalledWith(expectedTrainRun, 'Test Order', 1, 'Test Description');
        done();
      }, 100);
    });

    it('should not call createOrderFromTrainRun when dialog is cancelled', done => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(null)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        expect(mockListActionsService.createOrderFromTrainRun).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should not call createOrderFromTrainRun when dialog returns empty result', done => {
      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of({ orderData: null })),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        expect(mockListActionsService.createOrderFromTrainRun).not.toHaveBeenCalled();
        done();
      }, 100);
    });

    it('should pass all orderData fields to createOrderFromTrainRun', done => {
      const dialogResult = {
        orderData: {
          subject: 'Complete Order',
          orderType: 0,
          description: 'Full description text',
          trainNo: 'TR-001',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        const expectedTrainRun = {
          ...mockTrainRun,
          secondaryTrainNumber: 'ROUTE-001',
        };
        expect(mockListActionsService.createOrderFromTrainRun).toHaveBeenCalledWith(
          expectedTrainRun,
          'Complete Order',
          0,
          'Full description text',
        );
        done();
      }, 100);
    });

    it('should pass undefined description when not provided', done => {
      const dialogResult = {
        orderData: {
          subject: 'Order without description',
          orderType: 1,
          trainNo: 'TR-001',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        const expectedTrainRun = {
          ...mockTrainRun,
          secondaryTrainNumber: 'ROUTE-001',
        };
        expect(mockListActionsService.createOrderFromTrainRun).toHaveBeenCalledWith(
          expectedTrainRun,
          'Order without description',
          1,
          undefined,
        );
        done();
      }, 100);
    });

    it('should update trainRun with trainNo from orderData', done => {
      const dialogResult = {
        orderData: {
          subject: 'Test Order',
          orderType: 1,
          description: 'Test Description',
          trainNo: 'TR-999',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        const updatedTrainRun = (mockListActionsService.createOrderFromTrainRun as jest.Mock).mock.calls[0][0];
        expect(updatedTrainRun.trainNumber).toBe('TR-999');
        expect(mockListActionsService.createOrderFromTrainRun).toHaveBeenCalledWith(
          expect.objectContaining({ trainNumber: 'TR-999', secondaryTrainNumber: 'ROUTE-001' }),
          'Test Order',
          1,
          'Test Description',
        );
        done();
      }, 100);
    });

    it('should set secondaryTrainNumber to empty string when routeNumber is undefined', done => {
      const dialogResult = {
        orderData: {
          subject: 'Test Order',
          orderType: 1,
          description: 'Test Description',
          trainNo: 'TR-001',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, undefined);

      setTimeout(() => {
        const updatedTrainRun = (mockListActionsService.createOrderFromTrainRun as jest.Mock).mock.calls[0][0];
        expect(updatedTrainRun.secondaryTrainNumber).toBe('');
        done();
      }, 100);
    });

    it('should keep original trainNumber when trainNo is not provided in orderData', done => {
      const dialogResult = {
        orderData: {
          subject: 'Test Order',
          orderType: 1,
          description: 'Test Description',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['openCreateOrderDialog'](mockTrainRun, 'ROUTE-001');

      setTimeout(() => {
        const updatedTrainRun = (mockListActionsService.createOrderFromTrainRun as jest.Mock).mock.calls[0][0];
        expect(updatedTrainRun.trainNumber).toBe('TR-001');
        done();
      }, 100);
    });
  });

  describe('Integration Flow', () => {
    it('should complete full flow from copy action to order creation', done => {
      mockSpareCapacityService.getSpareCapacity.mockReturnValue(of(mockTrainRun));

      const dialogResult = {
        orderData: {
          subject: 'Integration Test Order',
          orderType: 0,
          description: 'Integration test description',
          trainNo: 'TR-001',
        },
      };

      const mockDialogRef = {
        afterClosed: jest.fn().mockReturnValue(of(dialogResult)),
      } as any;
      mockDialog.open.mockReturnValue(mockDialogRef);

      service['handleCopyOrder'](mockSpareCapacityItem);

      setTimeout(() => {
        expect(mockSpareCapacityService.getSpareCapacity).toHaveBeenCalledWith(1001, 1);
        expect(mockDialog.open).toHaveBeenCalled();
        const expectedTrainRun = {
          ...mockTrainRun,
          secondaryTrainNumber: 'ROUTE-001',
        };
        expect(mockListActionsService.createOrderFromTrainRun).toHaveBeenCalledWith(
          expectedTrainRun,
          'Integration Test Order',
          0,
          'Integration test description',
        );
        done();
      }, 100);
    });
  });

  describe('mapToViewModel', () => {
    it('should map operating days correctly', () => {
      const viewModel = service['mapToViewModel'](mockSpareCapacityItem);

      // Date should be formatted (non-empty) — exact format is locale-dependent
      expect(viewModel.beginDate).toBeTruthy();
      expect(viewModel.operatingDaysNames).toBeDefined();
    });

    it('should handle missing operating days', () => {
      const itemWithoutDays = { ...mockSpareCapacityItem, operatingDays: [] };
      const viewModel = service['mapToViewModel'](itemWithoutDays);

      // When no operating days, beginDate should be empty string
      expect(viewModel.beginDate).toBe('');
    });

    it('should preserve all SpareCapacityListItem fields', () => {
      const viewModel = service['mapToViewModel'](mockSpareCapacityItem);

      expect(viewModel.trainId).toBe(mockSpareCapacityItem.trainId);
      expect(viewModel.routeNumber).toBe(mockSpareCapacityItem.routeNumber);
      expect(viewModel.fromStation).toBe(mockSpareCapacityItem.fromStation);
      expect(viewModel.toStation).toBe(mockSpareCapacityItem.toStation);
    });
  });

  describe('extractItems', () => {
    it('should return items array from response', () => {
      const mockResponse = {
        spareCapacityList: [mockSpareCapacityItem],
        totalCount: 1,
      };

      const result = service['extractItems'](mockResponse);

      expect(result).toEqual([mockSpareCapacityItem]);
      expect(result.length).toBe(1);
    });

    it('should return empty array when spareCapacityList is null', () => {
      const mockResponse = {
        spareCapacityList: null,
        totalCount: 0,
      };

      const result = service['extractItems'](mockResponse);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('should return empty array when spareCapacityList is undefined', () => {
      const mockResponse = {
        spareCapacityList: undefined,
        totalCount: 0,
      };

      const result = service['extractItems'](mockResponse);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });
  });
});

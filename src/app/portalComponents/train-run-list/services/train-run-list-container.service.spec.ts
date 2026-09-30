// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import dayjs from 'dayjs';

import { ScheduleService, Source, TrainRunListItem, TrainState } from '@Ordering/api';
import { BaseListStateService } from '@Ordering/shared/services/base-list-state.service';
import { NavigationService } from '@Ordering/shared/services/navigation.service';
import { LoadingSpinnerService } from '@Ordering/shared/services/loading-spinner.service';
import { ErrorHandlingService } from '@Ordering/shared/services/error-handling.service';
import { FilterService } from '@Ordering/shared/services/filter.service';
import { ActionDialogService } from '@Ordering/shared/services/action-dialog.service';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { OrderingApiName } from '@Ordering/data/custom/enum/ordering-api-names.enum';
import { TrainListActions } from '@Ordering/data/custom/enum/train-list-actions.enum';
import { DateTimeFormat } from '@Ordering/utils/dates';
import { INITIAL_TRAIN_RUN_FILTER, TrainRunListFilter } from '@Ordering/portalComponents/train-run-list/models/train-run-list-filter.model';

import { TrainRunListContainerService } from './train-run-list-container.service';

describe('TrainRunListContainerService', () => {
  let service: TrainRunListContainerService;
  let scheduleServiceMock: jest.Mocked<ScheduleService>;
  let navigationServiceMock: jest.Mocked<NavigationService>;
  let loadingSpinnerServiceMock: jest.Mocked<LoadingSpinnerService>;
  let errorHandlingServiceMock: jest.Mocked<ErrorHandlingService>;
  let filterServiceMock: FilterService;
  let actionDialogServiceMock: jest.Mocked<ActionDialogService>;
  let translationsServiceMock: jest.Mocked<TranslationsService>;
  let userPermissionServiceMock: jest.Mocked<UserPermissionService>;
  let listStateSignal: ReturnType<typeof signal>;

  const mockTrainRunListItem: TrainRunListItem = {
    trainNumber: 'TRN001',
    trainId: 14001,
    schedVersionId: 202501,
    state: TrainState.PUBLISHED,
    trainSource: Source.RAILWAY_UNDERTAKING_WEB_PORTAL,
    operatingCompany: 'Test Company',
    trainType: 'Express',
    operatingDays: [{ beginDate: '2025-08-01', daysBitmap: '1111111' }],
    fromStation: { areaCode: 'A', station: 'Station A', stopType: 0 } as any,
    toStation: { areaCode: 'B', station: 'Station B', stopType: 0 } as any,
    lastModifiedDateTime: '2025-08-01T10:00:00Z',
    cancellationDateTime: '2025-08-02T10:00:00Z',
  };

  beforeEach(() => {
    scheduleServiceMock = { getTrainRuns: jest.fn().mockReturnValue(of({ trainRuns: [], totalCount: 0 })) } as any;
    navigationServiceMock = { navigate: jest.fn(), navigateToList: jest.fn() } as any;
    loadingSpinnerServiceMock = { showSpinner: jest.fn(), hideSpinner: jest.fn() } as any;
    errorHandlingServiceMock = { handleError: jest.fn() } as any;
    filterServiceMock = { trainFilterState: undefined } as any;
    actionDialogServiceMock = { openActionDialog: jest.fn().mockReturnValue(of(false)) } as any;
    translationsServiceMock = {
      translate: jest.fn((key: string) => `translated_${key}`),
      translateEnumValue: jest.fn((value: number, enumName: string) => `enum_${enumName}_${value}`),
    } as any;
    userPermissionServiceMock = {
      canCancelTrainRun: jest.fn().mockReturnValue(true),
      canModifyTrainRun: jest.fn().mockReturnValue(true),
      checkPermissions: jest.fn().mockReturnValue(true),
    } as any;

    listStateSignal = signal({
      filters: INITIAL_TRAIN_RUN_FILTER,
      paginationAndSorting: { pageIndex: 0, pageSize: 25, sortBy: undefined, sortOrder: 'ASC', totalCount: 0 },
    });

    TestBed.configureTestingModule({
      providers: [
        TrainRunListContainerService,
        { provide: ScheduleService, useValue: scheduleServiceMock },
        { provide: NavigationService, useValue: navigationServiceMock },
        { provide: LoadingSpinnerService, useValue: loadingSpinnerServiceMock },
        { provide: ErrorHandlingService, useValue: errorHandlingServiceMock },
        { provide: FilterService, useValue: filterServiceMock },
        { provide: ActionDialogService, useValue: actionDialogServiceMock },
        { provide: TranslationsService, useValue: translationsServiceMock },
        { provide: UserPermissionService, useValue: userPermissionServiceMock },
        {
          provide: ConfigDataService,
          useValue: {
            isRailwayUndertakingUser: jest.fn(),
            isInfrastructureManagerUser: jest.fn(),
            userPermissions: jest.fn().mockReturnValue({}),
          },
        },
        {
          provide: BaseListStateService,
          useValue: {
            getState: jest.fn().mockReturnValue(listStateSignal),
            updateFilters: jest.fn(),
            updatePagination: jest.fn(),
            updateSort: jest.fn(),
          },
        },
      ],
    });

    service = TestBed.inject(TrainRunListContainerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should bind the internal filter bridge form group to FilterService on construction', () => {
    expect(filterServiceMock.trainFilterState).toBe(service['filterBridgeFormGroup']);
  });

  describe('constructor effect - filterBridgeFormGroup sync', () => {
    it('should patch the form group with the current filter values', () => {
      TestBed.flushEffects();

      expect(service['filterBridgeFormGroup'].value).toEqual({
        dateRange: { beginDate: null, endDate: null },
        dateRangeType: INITIAL_TRAIN_RUN_FILTER.dateRangeType,
      });
    });

    it('should reflect updated dateRange and dateRangeType when currentFilters change', () => {
      const updatedFilter: TrainRunListFilter = {
        ...INITIAL_TRAIN_RUN_FILTER,
        dateRange: { beginDate: '2025-08-01', endDate: '2025-08-31' },
        dateRangeType: 'MODIFICATION_DATE' as any,
      };
      listStateSignal.set({
        filters: updatedFilter,
        paginationAndSorting: { pageIndex: 0, pageSize: 25, sortBy: undefined, sortOrder: 'ASC', totalCount: 0 },
      });
      TestBed.flushEffects();

      expect(service['filterBridgeFormGroup'].value).toEqual({
        dateRange: { beginDate: '2025-08-01', endDate: '2025-08-31' },
        dateRangeType: 'MODIFICATION_DATE',
      });
    });
  });

  describe('fetchData', () => {
    it('should show the spinner and call scheduleService.getTrainRuns with the filters minus showAllProjects', () => {
      scheduleServiceMock.getTrainRuns.mockReturnValue(of({ trainRuns: [mockTrainRunListItem], totalCount: 1 }));
      const filters: TrainRunListFilter = { ...INITIAL_TRAIN_RUN_FILTER, showAllProjects: true };
      const pagination = { pageIndex: 0, pageSize: 25 } as any;

      service['fetchData'](filters, pagination).subscribe();

      expect(loadingSpinnerServiceMock.showSpinner).toHaveBeenCalled();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { showAllProjects, ...apiFilters } = filters;
      expect(scheduleServiceMock.getTrainRuns).toHaveBeenCalledWith(true, apiFilters, pagination);
    });

    it('should hide the spinner once the request completes', () => {
      scheduleServiceMock.getTrainRuns.mockReturnValue(of({ trainRuns: [], totalCount: 0 }));

      service['fetchData'](INITIAL_TRAIN_RUN_FILTER, {} as any).subscribe();

      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
    });

    it('should handle errors by calling errorHandlingService and returning an empty response', () => {
      const error = new Error('network error');
      scheduleServiceMock.getTrainRuns.mockReturnValue(throwError(() => error));
      let result: unknown;

      service['fetchData'](INITIAL_TRAIN_RUN_FILTER, {} as any).subscribe(r => (result = r));

      expect(errorHandlingServiceMock.handleError).toHaveBeenCalledWith(error, OrderingApiName.GetTrainRunList);
      expect(result).toEqual({ trainRuns: [], totalCount: 0 });
      expect(loadingSpinnerServiceMock.hideSpinner).toHaveBeenCalled();
    });
  });

  describe('extractItems', () => {
    it('should return the trainRuns array from the response', () => {
      const response = { trainRuns: [mockTrainRunListItem], totalCount: 1 };
      expect(service['extractItems'](response)).toEqual([mockTrainRunListItem]);
    });

    it('should return an empty array when trainRuns is undefined', () => {
      expect(service['extractItems']({ totalCount: 0 } as any)).toEqual([]);
    });
  });

  describe('mapToViewModel', () => {
    it('should map all formatted fields when all optional data is present', () => {
      const result = service['mapToViewModel'](mockTrainRunListItem);

      expect(result.formattedLastModifiedDateTime).toBe(
        dayjs(mockTrainRunListItem.lastModifiedDateTime).format(DateTimeFormat.localeDateTime),
      );
      expect(result.formattedCancellationDateTime).toBe(
        dayjs(mockTrainRunListItem.cancellationDateTime).format(DateTimeFormat.localeDateTime),
      );
      expect(result.translatedState).toBe('enum_TrainState_0');
      expect(result.translatedSource).toBe('enum_TrainSource_0');
      expect(result.formattedBeginDate).toBe('2025-08-01');
      expect(result.fromStationDisplay).toBe('Station A');
      expect(result.toStationDisplay).toBe('Station B');
    });

    it('should default to empty strings when optional data is missing', () => {
      const item: TrainRunListItem = {
        ...mockTrainRunListItem,
        state: undefined,
        trainSource: undefined,
        cancellationDateTime: undefined,
        operatingDays: [],
        fromStation: undefined as any,
        toStation: undefined as any,
      };

      const result = service['mapToViewModel'](item);

      expect(result.formattedCancellationDateTime).toBe('');
      expect(result.translatedState).toBe('');
      expect(result.translatedSource).toBe('');
      expect(result.formattedBeginDate).toBe('');
      expect(result.fromStationDisplay).toBe('');
      expect(result.toStationDisplay).toBe('');
    });
  });

  describe('columns', () => {
    it('should return the full set of column configs', () => {
      const columns = service['columns'];
      expect(columns.map(c => c.field)).toEqual([
        'translatedState',
        'trainNumber',
        'formattedBeginDate',
        'trainType',
        'fromStationDisplay',
        'toStationDisplay',
        'formattedLastModifiedDateTime',
        'formattedCancellationDateTime',
        'translatedSource',
      ]);
    });

    it('should compute the state cssClass based on translated enum value', () => {
      const stateColumn = service['columns'].find(c => c.field === 'translatedState');
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);

      expect(stateColumn?.cssClass?.(viewModel)).toEqual(['state', 'enum_TrainState_0']);
    });

    it('should compute an empty state cssClass segment when state is undefined', () => {
      const stateColumn = service['columns'].find(c => c.field === 'translatedState');
      const viewModel = { ...service['mapToViewModel'](mockTrainRunListItem), state: undefined };

      expect(stateColumn?.cssClass?.(viewModel)).toEqual(['state', '']);
    });
  });

  describe('actions', () => {
    it('should define view, cancel, edit and copy actions', () => {
      const icons = service['actions'].map(a => a.icon);
      expect(icons).toEqual(['visibility', 'cancel', 'edit', 'file_copy']);
    });

    it('should navigate to the train run detail page when the view action handler runs', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const viewAction = service['actions'].find(a => a.icon === 'visibility');

      viewAction?.handler(viewModel);

      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/train-run', '14001', '202501']);
    });

    it('should use userPermissionService.canCancelTrainRun for the cancel action visibility', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const cancelAction = service['actions'].find(a => a.icon === 'cancel');

      cancelAction?.visible?.(viewModel);

      expect(userPermissionServiceMock.canCancelTrainRun).toHaveBeenCalledWith(viewModel);
    });

    it('should use userPermissionService.canModifyTrainRun for the edit action visibility', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const editAction = service['actions'].find(a => a.icon === 'edit');

      editAction?.visible?.(viewModel);

      expect(userPermissionServiceMock.canModifyTrainRun).toHaveBeenCalledWith(viewModel);
    });

    it('should open the action dialog with CANCEL_TRAIN_PATH when the cancel action handler runs', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const cancelAction = service['actions'].find(a => a.icon === 'cancel');

      cancelAction?.handler(viewModel);

      expect(actionDialogServiceMock.openActionDialog).toHaveBeenCalledWith({
        action: TrainListActions.CANCEL_TRAIN_PATH,
        trainRunListItemData: viewModel,
      });
    });

    it('should open the action dialog with MODIFY_TRAIN_RUN when the edit action handler runs', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const editAction = service['actions'].find(a => a.icon === 'edit');

      editAction?.handler(viewModel);

      expect(actionDialogServiceMock.openActionDialog).toHaveBeenCalledWith({
        action: TrainListActions.MODIFY_TRAIN_RUN,
        trainRunListItemData: viewModel,
      });
    });

    it('should open the action dialog with COPY_TRAIN_RUN when the copy action handler runs', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const copyAction = service['actions'].find(a => a.icon === 'file_copy');

      copyAction?.handler(viewModel);

      expect(actionDialogServiceMock.openActionDialog).toHaveBeenCalledWith({
        action: TrainListActions.COPY_TRAIN_RUN,
        trainRunListItemData: viewModel,
      });
    });

    it('should navigate to the list when the action dialog resolves truthy', () => {
      actionDialogServiceMock.openActionDialog.mockReturnValue(of(true));
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const cancelAction = service['actions'].find(a => a.icon === 'cancel');

      cancelAction?.handler(viewModel);

      expect(navigationServiceMock.navigateToList).toHaveBeenCalled();
    });

    it('should not navigate to the list when the action dialog resolves falsy', () => {
      actionDialogServiceMock.openActionDialog.mockReturnValue(of(false));
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const cancelAction = service['actions'].find(a => a.icon === 'cancel');

      cancelAction?.handler(viewModel);

      expect(navigationServiceMock.navigateToList).not.toHaveBeenCalled();
    });
  });

  describe('getOnRowClick', () => {
    it('should return a handler that navigates to the train run detail page', () => {
      const viewModel = service['mapToViewModel'](mockTrainRunListItem);
      const onRowClick = service['getOnRowClick']();

      onRowClick(viewModel);

      expect(navigationServiceMock.navigate).toHaveBeenCalledWith(['/train-run', '14001', '202501']);
    });
  });
});

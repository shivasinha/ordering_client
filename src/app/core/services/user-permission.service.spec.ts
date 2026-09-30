import { TestBed } from '@angular/core/testing';
import { UserPermissionService } from './user-permission.service';
import { ConfigDataService } from '@Ordering/shared/services/config-data.service';
import { ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';
import { OperandEnum, UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { Source, UserAccessRights, TrainState, TrainRunListItem } from '@Ordering/api';
import { ActionFrom } from '@Ordering/data/custom/enum/action-from.enum';

describe('UserPermissionService', () => {
  let service: UserPermissionService;
  let mockConfigDataService: jest.Mocked<ConfigDataService>;

  const mockUserPermissions: UserAccessRights = {
    canViewWebportal: true,
    canViewOrderList: true,
    canViewTrainList: true,
    canViewSpareCapacityList: true,
    canCreateOrEditOrder: true,
    canCreateOrEditOrderItem: true,
    canDeleteOrder: false,
    canSubmitOrCancelOrder: true,
    canInitiatePathAlteration: false,
    canInitiatePathCancellation: true,
    canConfirmOrRefuseOffer: true,
    canConfirmOfferLtp: false,
    canViewMessage: true,
    canSendMessage: false,
  };

  beforeEach(() => {
    const configDataServiceMock = {
      userPermissions: jest.fn(),
      isRailwayUndertakingUser: jest.fn(),
      isInfrastructureManagerUser: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [UserPermissionService, { provide: ConfigDataService, useValue: configDataServiceMock }],
    });

    service = TestBed.inject(UserPermissionService);
    mockConfigDataService = TestBed.inject(ConfigDataService) as jest.Mocked<ConfigDataService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('checkPermissions', () => {
    beforeEach(() => {
      mockConfigDataService.userPermissions.mockReturnValue(mockUserPermissions);
    });

    describe('single permission checks', () => {
      it('should return true when user has the required permission', () => {
        const result = service.checkPermissions('canViewWebportal');
        expect(result).toBe(true);
        expect(mockConfigDataService.userPermissions).toHaveBeenCalled();
      });

      it('should return false when user does not have the required permission', () => {
        const result = service.checkPermissions('canDeleteOrder');
        expect(result).toBe(false);
        expect(mockConfigDataService.userPermissions).toHaveBeenCalled();
      });

      it('should return false when userPermissions returns undefined', () => {
        mockConfigDataService.userPermissions.mockReturnValue(undefined);
        const result = service.checkPermissions('canViewWebportal');
        expect(result).toBe(false);
      });

      it('should return false when userPermissions returns null', () => {
        mockConfigDataService.userPermissions.mockReturnValue(null as any);
        const result = service.checkPermissions('canViewWebportal');
        expect(result).toBe(false);
      });
    });

    describe('multiple permissions with AND operator (default)', () => {
      it('should return true when user has all required permissions', () => {
        const permissions: (keyof UserAccessRights)[] = ['canViewWebportal', 'canViewOrderList', 'canCreateOrEditOrder'];
        const result = service.checkPermissions(permissions);
        expect(result).toBe(true);
      });

      it('should return false when user is missing at least one required permission', () => {
        const permissions: (keyof UserAccessRights)[] = ['canViewWebportal', 'canDeleteOrder', 'canCreateOrEditOrder'];
        const result = service.checkPermissions(permissions);
        expect(result).toBe(false);
      });

      it('should return true when user has all permissions with explicit AND operator', () => {
        const permissions: (keyof UserAccessRights)[] = ['canViewWebportal', 'canCreateOrEditOrder'];
        const result = service.checkPermissions(permissions, OperandEnum.AND);
        expect(result).toBe(true);
      });

      it('should return false when no permissions are granted and multiple are required', () => {
        const permissions: (keyof UserAccessRights)[] = ['canDeleteOrder', 'canInitiatePathAlteration'];
        const result = service.checkPermissions(permissions, OperandEnum.AND);
        expect(result).toBe(false);
      });
    });

    describe('multiple permissions with OR operator', () => {
      it('should return true when user has at least one of the required permissions', () => {
        const permissions: (keyof UserAccessRights)[] = ['canDeleteOrder', 'canViewWebportal'];
        const result = service.checkPermissions(permissions, OperandEnum.OR);
        expect(result).toBe(true);
      });

      it('should return false when user has none of the required permissions', () => {
        const permissions: (keyof UserAccessRights)[] = ['canDeleteOrder', 'canInitiatePathAlteration'];
        const result = service.checkPermissions(permissions, OperandEnum.OR);
        expect(result).toBe(false);
      });

      it('should return true when user has all of the required permissions', () => {
        const permissions: (keyof UserAccessRights)[] = ['canViewWebportal', 'canCreateOrEditOrder'];
        const result = service.checkPermissions(permissions, OperandEnum.OR);
        expect(result).toBe(true);
      });
    });

    describe('edge cases', () => {
      it('should handle empty permissions array with AND operator', () => {
        const result = service.checkPermissions([], OperandEnum.AND);
        expect(result).toBe(true); // Array.every() returns true for empty arrays
      });

      it('should handle empty permissions array with OR operator', () => {
        const result = service.checkPermissions([], OperandEnum.OR);
        expect(result).toBe(false); // Array.some() returns false for empty arrays
      });

      it('should handle single permission in array format', () => {
        const result = service.checkPermissions(['canViewWebportal']);
        expect(result).toBe(true);
      });
    });
  });

  describe('getRequiredPermission', () => {
    describe('EDIT action', () => {
      it('should return ORDER edit permissions when from parameter is ORDER', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.EDIT, ActionFrom.ORDER);
        expect(result).toEqual([UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]);
      });

      it('should return ORDERITEM edit permissions when from parameter is ORDERITEM', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.EDIT, ActionFrom.ORDERITEM);
        expect(result).toEqual([UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]);
      });

      it('should return ORDERITEM edit permissions when from parameter is not specified', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.EDIT);
        expect(result).toEqual([UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]);
      });
    });

    describe('DELETE action', () => {
      it('should return extended delete permissions when from parameter is not specified', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.DELETE);
        expect(result).toEqual([UserPermissionsEnum.CAN_DELETE_ORDER, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]);
      });

      it('should return delete permissions when from is ORDER', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.DELETE, ActionFrom.ORDER);
        expect(result).toEqual([UserPermissionsEnum.CAN_DELETE_ORDER]);
      });

      it('should return extended delete permissions when from is ORDERITEM', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.DELETE, ActionFrom.ORDERITEM);
        expect(result).toEqual([UserPermissionsEnum.CAN_DELETE_ORDER, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]);
      });
    });

    describe('CANCEL action', () => {
      it('should return cancel permissions', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.CANCEL);
        expect(result).toEqual([UserPermissionsEnum.CAN_SUBMIT_OR_CANCEL_ORDER]);
      });
    });

    describe('COPY action', () => {
      it('should return copy permissions', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.COPY);
        expect(result).toEqual([UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]);
      });
    });

    describe('CANCEL_TRAIN_RUN action', () => {
      it('should return train run cancellation permissions', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.CANCEL_TRAIN_RUN);
        expect(result).toEqual([
          UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM,
          UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER,
          UserPermissionsEnum.CAN_INITIATE_PATH_CANCELLATION,
          UserPermissionsEnum.CAN_SUBMIT_OR_CANCEL_ORDER,
        ]);
      });
    });

    describe('MODIFY_TRAIN_RUN action', () => {
      it('should return train run modification permissions', () => {
        const result = service.getRequiredPermission(ActionNamesEnum.MODIFY_TRAIN_RUN);
        expect(result).toEqual([
          UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM,
          UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER,
          UserPermissionsEnum.CAN_INITIATE_PATH_ALTERATION,
        ]);
      });
    });

    describe('unknown actions', () => {
      it('should return undefined for unknown action', () => {
        const result = service.getRequiredPermission('UNKNOWN_ACTION');
        expect(result).toBeUndefined();
      });

      it('should return undefined for empty action string', () => {
        const result = service.getRequiredPermission('');
        expect(result).toBeUndefined();
      });
    });
  });

  describe('integration tests', () => {
    beforeEach(() => {
      mockConfigDataService.userPermissions.mockReturnValue(mockUserPermissions);
    });

    it('should correctly validate user can perform EDIT action on ORDER', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.EDIT, ActionFrom.ORDER);
      const hasPermission = service.checkPermissions(requiredPermissions as keyof UserAccessRights);
      expect(hasPermission).toBe(true);
    });

    it('should correctly validate user can perform EDIT action on ORDERITEM', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.EDIT, ActionFrom.ORDERITEM);
      const hasPermission = service.checkPermissions(requiredPermissions as (keyof UserAccessRights)[]);
      expect(hasPermission).toBe(true);
    });

    it('should correctly validate user cannot perform DELETE action', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.DELETE);
      const hasPermission = service.checkPermissions(requiredPermissions as (keyof UserAccessRights)[]);
      expect(hasPermission).toBe(false);
    });

    it('should correctly validate user cannot perform DELETE action on ORDER', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.DELETE, ActionFrom.ORDER);
      const hasPermission = service.checkPermissions(requiredPermissions as (keyof UserAccessRights)[]);
      expect(hasPermission).toBe(false);
    });

    it('should correctly validate user cannot perform MODIFY_TRAIN_RUN action due to missing alteration permission', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.MODIFY_TRAIN_RUN);
      const hasPermission = service.checkPermissions(requiredPermissions as (keyof UserAccessRights)[]);
      expect(hasPermission).toBe(false); // canInitiatePathAlteration is false
    });

    it('should correctly validate user can perform CANCEL_TRAIN_RUN action', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.CANCEL_TRAIN_RUN);
      const hasPermission = service.checkPermissions(requiredPermissions as (keyof UserAccessRights)[]);
      expect(hasPermission).toBe(true); // All required permissions are true in our mock
    });

    it('should work with OR operator for partial permissions', () => {
      const requiredPermissions = service.getRequiredPermission(ActionNamesEnum.MODIFY_TRAIN_RUN);
      const hasPermission = service.checkPermissions(requiredPermissions as (keyof UserAccessRights)[], OperandEnum.OR);
      expect(hasPermission).toBe(true); // At least one permission is true
    });
  });

  describe('error handling', () => {
    it('should handle ConfigDataService throwing an error', () => {
      mockConfigDataService.userPermissions.mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      expect(() => {
        service.checkPermissions('canViewWebportal');
      }).toThrow('Service unavailable');
    });

    it('should handle malformed userPermissions object', () => {
      mockConfigDataService.userPermissions.mockReturnValue({} as UserAccessRights);
      const result = service.checkPermissions('canViewWebportal');
      expect(result).toBe(false);
    });
  });

  describe('canCancelTrainRun', () => {
    const createMockTrainRun = (source: Source, state: TrainState = TrainState.PUBLISHED): TrainRunListItem =>
      ({
        trainNumber: '12345',
        trainId: 1,
        schedVersionId: 1,
        state,
        trainSource: source,
        operatingCompany: 'Test Operator',
      }) as TrainRunListItem;

    beforeEach(() => {
      // Reset mocks before each test
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
    });

    describe('For RU users', () => {
      beforeEach(() => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
        mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
      });

      it('should return true for RAILWAY_UNDERTAKING_WEB_PORTAL source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return true for RAILWAY_UNDERTAKING_TAF_TAP source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_TAF_TAP);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return true for PATH_COORDINATION_SYSTEM source', () => {
        const trainRun = createMockTrainRun(Source.PATH_COORDINATION_SYSTEM);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return false for INFRASTRUCTURE_MANAGER source', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is not PUBLISHED', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL, TrainState.CANCELLED);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is CANCELLED', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL, TrainState.CANCELLED);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });
    });

    describe('For IM users', () => {
      beforeEach(() => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
        mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(true);
      });

      it('should return true for INFRASTRUCTURE_MANAGER source', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return false for RAILWAY_UNDERTAKING_WEB_PORTAL source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false for RAILWAY_UNDERTAKING_TAF_TAP source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_TAF_TAP);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false for PATH_COORDINATION_SYSTEM source', () => {
        const trainRun = createMockTrainRun(Source.PATH_COORDINATION_SYSTEM);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is not PUBLISHED', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER, TrainState.CANCELLED);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is CANCELLED', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER, TrainState.CANCELLED);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return false when trainSource is undefined', () => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
        const trainRun = { ...createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL), trainSource: undefined };
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when neither RU nor IM user', () => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
        mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL);
        const result = service.canCancelTrainRun(trainRun);
        expect(result).toBe(false);
      });
    });
  });

  describe('canModifyTrainRun', () => {
    const createMockTrainRun = (source: Source, state: TrainState = TrainState.PUBLISHED): TrainRunListItem =>
      ({
        trainNumber: '12345',
        trainId: 1,
        schedVersionId: 1,
        state,
        trainSource: source,
        operatingCompany: 'Test Operator',
      }) as TrainRunListItem;

    beforeEach(() => {
      // Reset mocks before each test
      mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
      mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
    });

    describe('For RU users', () => {
      beforeEach(() => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
        mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
      });

      it('should return true for RAILWAY_UNDERTAKING_WEB_PORTAL source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return true for RAILWAY_UNDERTAKING_TAF_TAP source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_TAF_TAP);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return false for PATH_COORDINATION_SYSTEM source', () => {
        const trainRun = createMockTrainRun(Source.PATH_COORDINATION_SYSTEM);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false for INFRASTRUCTURE_MANAGER source', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is not PUBLISHED', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL, TrainState.CANCELLED);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is CANCELLED', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL, TrainState.CANCELLED);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });
    });

    describe('For IM users', () => {
      beforeEach(() => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
        mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(true);
      });

      it('should return true for INFRASTRUCTURE_MANAGER source', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(true);
      });

      it('should return false for RAILWAY_UNDERTAKING_WEB_PORTAL source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false for RAILWAY_UNDERTAKING_TAF_TAP source', () => {
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_TAF_TAP);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false for PATH_COORDINATION_SYSTEM source', () => {
        const trainRun = createMockTrainRun(Source.PATH_COORDINATION_SYSTEM);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is not PUBLISHED', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER, TrainState.CANCELLED);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when train state is CANCELLED', () => {
        const trainRun = createMockTrainRun(Source.INFRASTRUCTURE_MANAGER, TrainState.CANCELLED);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });
    });

    describe('Edge cases', () => {
      it('should return false when trainSource is undefined', () => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(true);
        const trainRun = { ...createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL), trainSource: undefined };
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });

      it('should return false when neither RU nor IM user', () => {
        mockConfigDataService.isRailwayUndertakingUser.mockReturnValue(false);
        mockConfigDataService.isInfrastructureManagerUser.mockReturnValue(false);
        const trainRun = createMockTrainRun(Source.RAILWAY_UNDERTAKING_WEB_PORTAL);
        const result = service.canModifyTrainRun(trainRun);
        expect(result).toBe(false);
      });
    });
  });
});

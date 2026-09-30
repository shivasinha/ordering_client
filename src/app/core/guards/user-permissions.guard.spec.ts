import { TestBed } from '@angular/core/testing';
import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserPermissionsGuard } from './user-permissions.guard';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

// Mock the inject function since it's used in the guard
jest.mock('@angular/core', () => ({
  ...jest.requireActual('@angular/core'),
  inject: jest.fn(),
}));

describe('UserPermissionsGuard', () => {
  let mockNavigationService: any;
  let mockUserPermissionService: jest.Mocked<UserPermissionService>;
  let mockActivatedRouteSnapshot: ActivatedRouteSnapshot;
  let mockRouterStateSnapshot: RouterStateSnapshot;
  let mockInject: jest.MockedFunction<any>;

  // Helper function to set routeConfig
  const setRouteConfig = (config: any) => {
    Object.defineProperty(mockActivatedRouteSnapshot, 'routeConfig', {
      writable: true,
      configurable: true,
      value: config,
    });
  };

  beforeEach(() => {
    // Reset the inject mock
    mockInject = inject as jest.MockedFunction<any>;

    mockNavigationService = {
      navigate: jest.fn(),
      navigateToList: jest.fn(),
      navigateToLogin: jest.fn(),
    } as any;

    mockUserPermissionService = {
      checkPermissions: jest.fn(),
    } as any;

    // Create a proper mock for ActivatedRouteSnapshot
    mockActivatedRouteSnapshot = {} as ActivatedRouteSnapshot;
    setRouteConfig({ path: '' });

    mockRouterStateSnapshot = {} as RouterStateSnapshot;

    TestBed.configureTestingModule({
      providers: [
        { provide: NavigationService, useValue: mockNavigationService },
        { provide: UserPermissionService, useValue: mockUserPermissionService },
      ],
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('UserPermissionsGuard function', () => {
    beforeEach(() => {
      // Mock inject to return the appropriate services
      mockInject.mockImplementation((token: any) => {
        if (token === NavigationService) {
          return mockNavigationService;
        }
        if (token === UserPermissionService) {
          return mockUserPermissionService;
        }
        return null;
      });
    });

    describe('when user has required permissions', () => {
      beforeEach(() => {
        mockUserPermissionService.checkPermissions.mockReturnValue(true);
      });

      it('should return true for orders/:order-id/order-items/add route when user can create order items', () => {
        setRouteConfig({ path: 'orders/:order-id/order-items/add' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(true);
        expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM);
        expect(mockNavigationService.navigateToList).not.toHaveBeenCalled();
      });

      it('should return true for orders/add route when user can create orders', () => {
        setRouteConfig({ path: 'orders/add' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(true);
        expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER);
        expect(mockNavigationService.navigateToList).not.toHaveBeenCalled();
      });
    });

    describe('when user lacks required permissions', () => {
      beforeEach(() => {
        mockUserPermissionService.checkPermissions.mockReturnValue(false);
      });

      it('should return false and navigate to /list for orders/:order-id/order-items/add route when user cannot create order items', () => {
        setRouteConfig({ path: 'orders/:order-id/order-items/add' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM);
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });

      it('should return false and navigate to /list for orders/add route when user cannot create orders', () => {
        setRouteConfig({ path: 'orders/add' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER);
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });
    });

    describe('for unknown routes', () => {
      it('should return false and navigate to /list for unknown route paths', () => {
        setRouteConfig({ path: 'unknown/route' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });

      it('should return false and navigate to /list for empty route path', () => {
        setRouteConfig({ path: '' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });

      it('should handle case where routeConfig is undefined', () => {
        setRouteConfig(undefined);

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });

      it('should handle case where routeConfig.path is undefined', () => {
        setRouteConfig({} as any);

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });
    });

    describe('service injection edge cases', () => {
      it('should handle NavigationService injection', () => {
        setRouteConfig({ path: 'unknown/route' });

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(false);
        expect(mockInject).toHaveBeenCalledWith(NavigationService);
        expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      });

      it('should handle UserPermissionService injection for known routes', () => {
        setRouteConfig({ path: 'orders/add' });
        mockUserPermissionService.checkPermissions.mockReturnValue(true);

        const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

        expect(result).toBe(true);
        expect(mockInject).toHaveBeenCalledWith(NavigationService);
        expect(mockInject).toHaveBeenCalledWith(UserPermissionService);
      });
    });
  });

  describe('checkPermissionForRoute function behavior', () => {
    beforeEach(() => {
      mockInject.mockImplementation((token: any) => {
        if (token === NavigationService) {
          return mockNavigationService;
        }
        if (token === UserPermissionService) {
          return mockUserPermissionService;
        }
        return null;
      });
    });

    it('should check CAN_CREATE_OR_EDIT_ORDER_ITEM permission for order item creation route', () => {
      setRouteConfig({ path: 'orders/:order-id/order-items/add' });
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM);
    });

    it('should check CAN_CREATE_OR_EDIT_ORDER permission for order creation route', () => {
      setRouteConfig({ path: 'orders/add' });
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(mockUserPermissionService.checkPermissions).toHaveBeenCalledWith(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER);
    });

    it('should not call checkPermissions for unknown routes', () => {
      setRouteConfig({ path: 'some/other/route' });

      UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
    });
  });

  describe('integration scenarios', () => {
    beforeEach(() => {
      mockInject.mockImplementation((token: any) => {
        if (token === NavigationService) {
          return mockNavigationService;
        }
        if (token === UserPermissionService) {
          return mockUserPermissionService;
        }
        return null;
      });
    });

    it('should allow navigation when user has permissions for order item creation', () => {
      setRouteConfig({ path: 'orders/:order-id/order-items/add' });
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(result).toBe(true);
      expect(mockNavigationService.navigateToList).not.toHaveBeenCalled();
    });

    it('should redirect when user lacks permissions for order creation', () => {
      setRouteConfig({ path: 'orders/add' });
      mockUserPermissionService.checkPermissions.mockReturnValue(false);

      const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(result).toBe(false);
      expect(mockNavigationService.navigateToList).toHaveBeenCalled();
    });

    it('should always redirect for unrecognized routes regardless of permissions', () => {
      setRouteConfig({ path: 'admin/panel' });
      // Even if permissions would be true, unrecognized routes should redirect
      mockUserPermissionService.checkPermissions.mockReturnValue(true);

      const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(result).toBe(false);
      expect(mockNavigationService.navigateToList).toHaveBeenCalled();
      expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    beforeEach(() => {
      mockInject.mockImplementation((token: any) => {
        if (token === NavigationService) {
          return mockNavigationService;
        }
        if (token === UserPermissionService) {
          return mockUserPermissionService;
        }
        return null;
      });
    });

    it('should handle UserPermissionService throwing an error', () => {
      setRouteConfig({ path: 'orders/add' });
      mockUserPermissionService.checkPermissions.mockImplementation(() => {
        throw new Error('Permission service error');
      });

      expect(() => {
        UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);
      }).toThrow('Permission service error');
    });

    it('should handle NavigationService throwing an error during navigation', () => {
      setRouteConfig({ path: 'unknown/route' });
      mockNavigationService.navigateToList.mockImplementation(() => {
        throw new Error('Navigation error');
      });

      expect(() => {
        UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);
      }).toThrow('Navigation error');
    });
  });

  describe('route path variations', () => {
    beforeEach(() => {
      mockInject.mockImplementation((token: any) => {
        if (token === NavigationService) {
          return mockNavigationService;
        }
        if (token === UserPermissionService) {
          return mockUserPermissionService;
        }
        return null;
      });
    });

    it('should be case-sensitive for route matching', () => {
      setRouteConfig({ path: 'Orders/Add' }); // Different case

      const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(result).toBe(false);
      expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
      expect(mockNavigationService.navigateToList).toHaveBeenCalled();
    });

    it('should handle extra whitespace in route paths', () => {
      setRouteConfig({ path: ' orders/add ' }); // With whitespace

      const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(result).toBe(false);
      expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
      expect(mockNavigationService.navigateToList).toHaveBeenCalled();
    });

    it('should match exact route paths only', () => {
      setRouteConfig({ path: 'orders/add/extra' }); // Extra segment

      const result = UserPermissionsGuard(mockActivatedRouteSnapshot, mockRouterStateSnapshot);

      expect(result).toBe(false);
      expect(mockUserPermissionService.checkPermissions).not.toHaveBeenCalled();
      expect(mockNavigationService.navigateToList).toHaveBeenCalled();
    });
  });
});

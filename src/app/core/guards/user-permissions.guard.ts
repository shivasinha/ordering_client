import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { NavigationService } from '@Ordering/shared/services/navigation.service';

/**
 * Route guard that checks user permissions before allowing navigation.
 * Redirects to '/list' if user lacks required permissions for the route.
 *
 * @param route - The activated route snapshot containing route information
 * @returns {boolean} True if user has permissions, false otherwise
 */
export const UserPermissionsGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const navigationService = inject(NavigationService);
  const currentRoute = route.routeConfig?.path ?? '';
  if (!checkPermissionForRoute(currentRoute)) {
    navigationService.navigateToList();
    return false;
  }
  return true;
};

/**
 * Checks if the user has the required permissions for a specific route.
 *
 * @param routePath - The route path to check permissions for
 * @returns {boolean} True if user has required permissions, false otherwise
 */
function checkPermissionForRoute(routePath: string): boolean {
  const userPermissionService: UserPermissionService = inject(UserPermissionService);
  switch (routePath) {
    case 'orders/:order-id/order-items/add':
      return userPermissionService.checkPermissions(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM);
    case 'orders/add':
      return userPermissionService.checkPermissions(UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER);
    default:
      return false;
  }
}

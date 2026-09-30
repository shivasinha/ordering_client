import { inject, Injectable } from '@angular/core';
import { ConfigDataService } from '../../shared/services/config-data.service';
import { ActionNamesEnum } from '@Ordering/data/custom/enum/listTypes';
import { ActionFrom } from '@Ordering/data/custom/enum/action-from.enum';
import { OperandEnum, UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { Source, TrainRun, TrainRunListItem, TrainState, UserAccessRights } from '@Ordering/api';
import { isValidEnumValue } from '@Ordering/utils/type-guards/common';

@Injectable({
  providedIn: 'root',
})
export class UserPermissionService {
  private readonly configDataService: ConfigDataService = inject(ConfigDataService);

  /**
   * Checks if the user has the required permissions for a specific route.
   *
   * @param routePath - The route path to check permissions for
   * @returns {boolean} True if user has required permissions, false otherwise
   */
  public checkPermissions(
    requiredPermissions: keyof UserAccessRights | (keyof UserAccessRights)[],
    operator: OperandEnum = OperandEnum.AND,
  ): boolean {
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    if (operator === OperandEnum.AND) {
      return permissions.every(permission => this.configDataService.userPermissions()?.[permission]);
    } else {
      return permissions.some(permission => this.configDataService.userPermissions()?.[permission]);
    }
  }

  /**
   * Gets the required permissions for a specific action on orders or order items.
   *
   * @param actionName - The action to check permissions for
   * @param from - Optional context specifying whether action is for ORDER or ORDERITEM
   * @returns {keyof UserAccessRights | (keyof UserAccessRights)[]} Single permission or array of required permissions
   */
  public getRequiredPermission(actionName: string, from?: ActionFrom): keyof UserAccessRights | (keyof UserAccessRights)[] {
    const permissionRequirements: { [key: string]: keyof UserAccessRights | (keyof UserAccessRights)[] } = {
      [ActionNamesEnum.EDIT]:
        from === ActionFrom.ORDER
          ? [UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER]
          : [UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER],
      [ActionNamesEnum.DELETE]:
        from === ActionFrom.ORDER
          ? [UserPermissionsEnum.CAN_DELETE_ORDER]
          : [UserPermissionsEnum.CAN_DELETE_ORDER, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER],
      [ActionNamesEnum.CANCEL]: [UserPermissionsEnum.CAN_SUBMIT_OR_CANCEL_ORDER],
      [ActionNamesEnum.COPY]: [UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM, UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER],
      [ActionNamesEnum.CANCEL_TRAIN_RUN]: [
        UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM,
        UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER,
        UserPermissionsEnum.CAN_INITIATE_PATH_CANCELLATION,
        UserPermissionsEnum.CAN_SUBMIT_OR_CANCEL_ORDER,
      ],
      [ActionNamesEnum.MODIFY_TRAIN_RUN]: [
        UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM,
        UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER,
        UserPermissionsEnum.CAN_INITIATE_PATH_ALTERATION,
      ],
    };

    const requiredPermission = permissionRequirements[actionName];
    return requiredPermission;
  }

  /**
   * Determines whether the current user can perform an action on a train run based on their role and the train's source.
   *
   * @param {TrainRunListItem | TrainRun} trainRun - The train run item to check permissions for.
   * @param {Source[]} ruAllowedSources - The list of allowed sources for Railway Undertaking users.
   * @param {Source[]} imAllowedSources - The list of allowed sources for Infrastructure Manager users.
   * @returns {boolean} `true` if the user is allowed to perform the action on the train run; otherwise, `false`.
   */
  private canPerformTrainAction(trainRun: TrainRunListItem | TrainRun, ruAllowedSources: Source[], imAllowedSources: Source[]): boolean {
    if (!isValidEnumValue(trainRun.trainSource) || trainRun.state !== TrainState.PUBLISHED) return false;

    if (this.configDataService.isRailwayUndertakingUser()) {
      return ruAllowedSources.includes(trainRun.trainSource!);
    }

    if (this.configDataService.isInfrastructureManagerUser()) {
      return imAllowedSources.includes(trainRun.trainSource!);
    }

    return false;
  }

  /**
   * Determines whether the current user is allowed to cancel a train run.
   * The method further checks if the user has permission to perform the cancel action based on the train run's source.
   *
   * @param {TrainRunListItem | TrainRun} trainRun - The train run item to check, either a `TrainRunListItem` or a `TrainRun`.
   * @returns {boolean} `true` if the user can cancel the train run; otherwise, `false`.
   */
  public canCancelTrainRun(trainRun: TrainRunListItem | TrainRun): boolean {
    return this.canPerformTrainAction(
      trainRun,
      [Source.RAILWAY_UNDERTAKING_WEB_PORTAL, Source.RAILWAY_UNDERTAKING_TAF_TAP, Source.PATH_COORDINATION_SYSTEM],
      [Source.INFRASTRUCTURE_MANAGER],
    );
  }

  /**
   * Determines if the user can modify a train run based on its source, state and user type.
   * IM users can only modify trains created by Infrastructure Manager.
   * RU users can modify trains from RU web portal and TAF/TAP sources.
   *
   * @param {Source | undefined} trainSource - The source of the train
   * @param {TrainState | undefined} trainState - The state of the train
   * @returns {boolean} - True if the user can modify the train, false otherwise
   */
  public canModifyTrainRun(trainRun: TrainRunListItem | TrainRun): boolean {
    return this.canPerformTrainAction(
      trainRun,
      [Source.RAILWAY_UNDERTAKING_WEB_PORTAL, Source.RAILWAY_UNDERTAKING_TAF_TAP],
      [Source.INFRASTRUCTURE_MANAGER],
    );
  }
}

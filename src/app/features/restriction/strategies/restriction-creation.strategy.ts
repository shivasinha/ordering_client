import { Injectable } from '@angular/core';
import {
  AdminDataEntry,
  OrderContent,
  OrderItemAction,
  OrderItemContent,
  OrderItemType,
  Restriction,
  RestrictionTimeSlots,
} from '@Ordering/api';
import {
  ComponentSlot,
  ItemContext,
  SlotDisplayMode,
  TitleConfig,
  ValidationResult,
} from '@Ordering/shared/models/component-slot.interface';
import { ItemContextData, ItemOperationStrategy } from '@Ordering/shared/models/item-operation-strategy.interface';
import { ItemRouteType } from '@Ordering/shared/models/order-item-module.interface';
import { ContributorKey } from '@Ordering/data/custom/enum/contributor-key.enum';
import { UserPermissionsEnum } from '@Ordering/data/custom/enum/user-permissions.enum';
import { SignalsSlotComponent } from '@Ordering/portalComponents/signals/signals-slot.component';
import { TimeSlotsSlotComponent } from '@Ordering/portalComponents/time-slots/time-slots-slot.component';

import {
  RestrictionHeaderData,
  RestrictionHeaderFormComponent,
} from '../components/restriction-header-form/restriction-header-form.component';

/**
 * Strategy for creating a new restriction within an order.
 *
 * The strategy wires the restriction header, signal list, and time-slot editor
 * into the shared order-item host.
 */
@Injectable()
export class RestrictionCreationStrategy implements ItemOperationStrategy {
  readonly operationType = OrderItemAction.CREATION;
  readonly moduleId = OrderItemType.RESTRICTION;

  /**
   * Returns the contributor slots rendered for restriction creation.
   *
   * @returns {ComponentSlot[]} The restriction header, signal, and time-slot slots.
   */
  public getComponentSlots(): ComponentSlot[] {
    return [
      { component: RestrictionHeaderFormComponent, contributorKey: ContributorKey.RESTRICTION_HEADER, layout: 'full' },
      { component: SignalsSlotComponent, contributorKey: ContributorKey.SIGNALS, layout: 'collapsible' },
      { component: TimeSlotsSlotComponent, contributorKey: ContributorKey.TIME_SLOTS, layout: 'collapsible' },
    ];
  }

  /**
   * Builds the restriction title for the current route context.
   *
   * @param {OrderItemContent | null} _item - Unused resolved item reference.
   * @param {ItemContext} context - Current route and translation context.
   * @returns {TitleConfig} The translated title configuration.
   */
  public getTitleConfig(_item: OrderItemContent | null, context: ItemContext): TitleConfig {
    const key = context.routeType === ItemRouteType.OFFER_ITEM ? 'lblOfferedRestriction' : 'lblRequestRestriction';
    return { title: context.translate(key) };
  }

  /**
   * Extracts contributor input from an existing restriction item.
   *
   * @param {OrderItemContent} item - The resolved order content item.
   * @returns {Record<string, unknown>} Initial data grouped by contributor key.
   */
  public extractInitialData(item: OrderItemContent): Record<string, unknown> {
    const restriction = item as Restriction;
    return {
      [ContributorKey.RESTRICTION_HEADER]: {
        name: restriction?.name ?? '',
        referenceId: restriction?.referenceId ?? '',
        busRefId: restriction?.busRefId ?? null,
        description: restriction?.description ?? '',
        operatingCompanyID: restriction?.operatingCompanyID ?? null,
        projectId: restriction?.projectId ?? null,
        subProjectId: restriction?.subProjectId ?? null,
        workTypeId: restriction?.workTypeId ?? null,
        lineOfWorkId: restriction?.lineOfWorkId ?? null,
        notesForPlanner: restriction?.notesForPlanner ?? '',
        yellowFleetId: restriction?.yellowFleetId ?? null,
        interruptible: restriction?.interruptible ?? null,
        speedRestriction: restriction?.speedRestriction ?? false,
        catShutOff: restriction?.catShutOff ?? false,
      },
      [ContributorKey.SIGNALS]: restriction.area ?? [],
      [ContributorKey.TIME_SLOTS]: restriction?.time ?? [],
    };
  }

  /**
   * Resolves whether the restriction flow is editable or read-only.
   *
   * @param {ItemContext} context - Current view context.
   * @returns {{ globalMode: SlotDisplayMode }} The global slot display mode.
   */
  public resolveEditMode(context: ItemContext): { globalMode: SlotDisplayMode } {
    const hasEditPermission = context.userPermissions.checkPermissions([
      UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER,
      UserPermissionsEnum.CAN_CREATE_OR_EDIT_ORDER_ITEM,
    ]);
    const readonly = context.isOfferItemView || context.isIMViewingRUOrder || context.isReadonlyOrderState || !hasEditPermission;
    return { globalMode: readonly ? SlotDisplayMode.READONLY : SlotDisplayMode.EDITABLE };
  }

  /**
   * Validates the aggregated contributor data before save.
   *
   * @param {Record<string, unknown>} aggregatedData - Combined slot data from the form aggregator.
   * @returns {ValidationResult} Validation result with translated error keys.
   */
  public validateBeforeSave(aggregatedData: Record<string, unknown>): ValidationResult {
    const header = aggregatedData[ContributorKey.RESTRICTION_HEADER] as RestrictionHeaderData | undefined;
    const requiredFields: { key: keyof RestrictionHeaderData; message: string }[] = [
      { key: 'name', message: 'msgErrorMissingRestrictionName' },
      { key: 'operatingCompanyID', message: 'msgErrorMissingOperatingCompany' },
      { key: 'workTypeId', message: 'msgErrorMissingWorkType' },
      { key: 'lineOfWorkId', message: 'msgErrorMissingLineOfWork' },
    ];
    const errors = requiredFields
      .filter(field => header?.[field.key] == null || header[field.key] === '')
      .map(field => ({ key: field.key as string, message: field.message }));
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Builds the payload sent to the API when saving a restriction.
   *
   * @param {Record<string, unknown>} aggregatedData - Combined slot data from the form aggregator.
   * @param {ItemContextData} contextData - Context from the active order-item host.
   * @returns {OrderContent} The order-content envelope for the create operation.
   */
  public assembleSavePayload(aggregatedData: Record<string, unknown>, contextData: ItemContextData): OrderContent {
    const header = aggregatedData[ContributorKey.RESTRICTION_HEADER] as RestrictionHeaderData;
    const signals = (aggregatedData[ContributorKey.SIGNALS] as AdminDataEntry[] | undefined) ?? [];
    const timeSlots = (aggregatedData[ContributorKey.TIME_SLOTS] as RestrictionTimeSlots[] | undefined) ?? [];

    const restriction: Restriction = {
      ...((contextData['originalItem'] as Partial<Restriction>) ?? {}),
      name: header.name,
      referenceId: header.referenceId || '',
      busRefId: header.busRefId ?? undefined,
      area: signals,
      time: timeSlots,
      description: header.description || '',
      operatingCompanyID: header.operatingCompanyID ?? '0',
      projectId: header.projectId ?? undefined,
      subProjectId: header.subProjectId ?? undefined,
      workTypeId: header.workTypeId ?? '0',
      lineOfWorkId: header.lineOfWorkId ?? '0',
      notesForPlanner: header.notesForPlanner || '',
      yellowFleetId: header.yellowFleetId ?? undefined,
      interruptible: header.interruptible ?? undefined,
      speedRestriction: header.speedRestriction,
      catShutOff: header.catShutOff,
    };

    return { type: OrderItemType.RESTRICTION, action: OrderItemAction.CREATION, item: restriction };
  }
}

import { Type } from '@angular/core';
import { OrderItemContent, OrderState } from '@Ordering/api';
import { UserPermissionService } from '@Ordering/core/services/user-permission.service';
import { ItemDataContributor } from './item-data-contributor.interface';
import { ItemRouteType } from './order-item-module.interface';

export enum SlotDisplayMode {
  EDITABLE = 'EDITABLE',
  READONLY = 'READONLY',
}

/**
 * Defines a dynamic component slot rendered by the host.
 * Strategies return arrays of these from getComponentSlots().
 * The display mode (EDITABLE/READONLY) is determined globally by the strategy
 * via resolveEditMode() — individual slots do not override it.
 */
export interface ComponentSlot {
  component: Type<ItemDataContributor<unknown>>;
  contributorKey: string;
  inputs?: Record<string, unknown> | ((item: OrderItemContent | null, context: ItemContext) => Record<string, unknown>);
  layout?: 'full' | 'half' | 'collapsible';
  /** Controls slot visibility reactively based on aggregated form data. Defaults to always visible. */
  visible?: (context: ItemContext, aggregatedData: Record<string, unknown>) => boolean;
}

export interface TitleConfig {
  /** Pre-resolved display title (already translated, with any suffix appended). */
  title: string;
  /** Optional state badge rendered next to the title. */
  stateBadge?: {
    /** Raw state value (used for CSS class via translatableEnum pipe). */
    state: unknown;
    /** Enum name for the translatableEnum pipe (e.g. EnumNameList.TrainState). */
    stateEnumName: string;
  };
}

/**
 * View context passed to strategy methods.
 * Contains order state, route info, and permission service reference.
 */
export interface ItemContext {
  orderState?: OrderState;
  isReadonlyOrderState: boolean;
  isOfferItemView: boolean;
  isIMViewingRUOrder: boolean;
  isCatalogView: boolean;
  userPermissions: UserPermissionService;
  routeType: ItemRouteType;
  /** Translation function for building display strings in strategies. */
  translate: (key: string) => string;
}

export interface ValidationResult {
  valid: boolean;
  errors?: { key: string; message: string }[];
}

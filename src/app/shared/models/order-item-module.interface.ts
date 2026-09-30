import { OrderContent, OrderItemContent, OrderItemType, OrderItemAction } from '@Ordering/api';

/**
 * Route context type — determines view behavior and permissions.
 */
export enum ItemRouteType {
  ORDER_ITEM_ADD = 'order-item-add',
  ORDER_ITEM_EDIT = 'order-item-edit',
  OFFER_ITEM = 'offer-item',
  CATALOG = 'catalog',
}

/**
 * View-only strategy types — not backed by an OrderItemType.
 * Use when the host renders an item outside an order context.
 */
export enum ViewActionType {
  TRAIN_RUN_CATALOG = 'VIEW:TRAIN_RUN_CATALOG',
}

/**
 * Union key used by the registry and strategies.
 * Covers both order-level operations (OrderItemAction) and
 * view-only routes (ViewActionType).
 */
export type OperationType = OrderItemAction | ViewActionType;

/**
 * Data extracted from router navigation state during a copy flow.
 */
export interface CopyFlowData {
  item: OrderItemContent;
  operationType: OperationType;
  extraContext?: Record<string, unknown>;
}

export interface OrderItemModule {
  readonly moduleId: OrderItemType;
  readonly labelKey: string;
  readonly icon: string;
  readonly defaultCreationOperation: OperationType;

  /**
   * Route segment that identifies catalog views for this module (e.g. 'train-run').
   * If the URL contains this segment, the host uses catalog view mode.
   */
  readonly catalogRouteSegment?: string;

  /**
   * ViewActionType used for catalog/read-only views.
   */
  readonly catalogViewStrategy?: ViewActionType;

  /**
   * Route data keys where this module's resolver places items.
   * The host iterates these to find a resolved item. E.g. ['trainRun'].
   */
  readonly resolverKeys?: string[];

  /**
   * Extracts copy-flow data from router navigation state.
   * Return null if no copy data is present.
   * @param {Record<string, unknown>} navState - Router navigation state.
   * @returns {CopyFlowData | null} Copy data or null.
   */
  extractCopyData?(navState: Record<string, unknown>): CopyFlowData | null;

  /**
   * Detects if the operation type should be overridden based on the active item's content.
   * E.g. detecting replacement when the active item is a replacement type.
   * @param {OrderContent | null} activeContent - The resolved active item's content envelope (type + item).
   * @returns {OperationType | null} Overridden type or null to keep current.
   */
  detectOperationOverride?(activeContent: OrderContent | null): OperationType | null;

  /**
   * Builds module-specific context data for assembleSavePayload.
   * The host merges the returned object into ItemContextData.
   * @param {OrderItemContent | null} activeItem - The resolved content item being edited/viewed.
   * @param {Record<string, unknown>} navState - Router navigation state.
   * @returns {Record<string, unknown>} Additional context data to merge.
   */
  buildContextData?(activeItem: OrderItemContent | null, navState: Record<string, unknown>): Record<string, unknown>;

  /**
   * Called after a successful save. Module-specific cleanup (e.g. clearing cached train data).
   */
  onSaveComplete?(): void;
}

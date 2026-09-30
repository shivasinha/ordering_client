import { OrderContent, OrderItemContent, OrderItemType } from '@Ordering/api';
import { ComponentSlot, ItemContext, SlotDisplayMode, TitleConfig, ValidationResult } from './component-slot.interface';
import { OperationType } from './order-item-module.interface';

/**
 * Describes an action button rendered by the host component.
 * Strategies return these from `getActionButtons()` to inject
 * custom buttons (e.g. "Modify Train Run") without the host
 * knowing about specific item types.
 * Strategies are responsible for evaluating visibility — only return
 * buttons that should actually be rendered.
 */

export enum ActionButtonColor {
  PRIMARY = 'primary',
  ACCENT = 'accent',
  WARN = 'warn',
}

export type ActionButtonVariant = 'raised' | 'stroked';

export interface HostAction {
  /** Pre-translated button label (strategy resolves via context.translate). */
  label: string;
  /** Material button color. */
  color?: ActionButtonColor;
  /** Button appearance variant. Defaults to 'raised'. */
  variant?: ActionButtonVariant;
  /** Whether the button is disabled. Defaults to false. */
  disabled?: boolean;
  /** Callback executed when the button is clicked. */
  execute: () => void;
}

/**
 * Core contract for order-item operation strategies.
 * Each strategy handles a specific OrderItemType or ViewActionType
 * and determines rendering, edit mode, validation, and save logic.
 */
export interface ItemOperationStrategy {
  readonly operationType: OperationType;
  readonly moduleId: OrderItemType;

  getComponentSlots(): ComponentSlot[];
  getTitleConfig(item: OrderItemContent | null, context: ItemContext): TitleConfig;
  assembleSavePayload?(aggregatedData: Record<string, unknown>, contextData: ItemContextData): OrderContent;
  extractInitialData(item: OrderItemContent): Record<string, unknown>;
  resolveEditMode(context: ItemContext): { globalMode: SlotDisplayMode };
  validateBeforeSave?(aggregatedData: Record<string, unknown>): ValidationResult;

  /**
   * Returns custom action buttons for the host to render.
   * Called reactively — return pre-evaluated visibility and closures.
   */
  getActionButtons?(item: OrderItemContent | null, context: ItemContext, contextData: ItemContextData): HostAction[];
}

/**
 * Non-form data needed by assembleSavePayload —
 * sourced from the order context, route params, or router state.
 * Base fields are set by the host; module-specific fields via buildContextData().
 */
export interface ItemContextData {
  orderId: string;
  parentExternalId?: string;
  [key: string]: unknown;
}

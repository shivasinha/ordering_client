/**
 * Configuration for a per-row action button in SlotListComponent.
 */
export interface SlotRowActionConfig<T = any> {
  /** Material icon name (e.g. 'edit', 'clear') */
  icon: string;

  /** Pre-translated tooltip string */
  tooltipKey: string;

  /**
   * Called directly when the action button is clicked.
   * The handler is fully responsible for any dialog, state mutation, and aggregator notification.
   */
  handler: (row: T) => void;

  /** Optional predicate to conditionally show the button */
  visible?: (row: T) => boolean;
}

/**
 * Configuration for a slot-level action button rendered below the list
 * (e.g. "Add Signal", "Import Signal").
 */
export interface SlotButtonActionConfig {
  /** Pre-translated button label string */
  labelKey: string;

  /**
   * Called directly when the button is clicked.
   * The handler is fully responsible for opening dialogs, appending items, and notifying state.
   */
  handler: () => void;
}

/**
 * Column definition for SlotListComponent.
 */
export interface SlotListColumn<T = any> {
  /** Property key of the data item to display */
  field: keyof T | string;

  /** Pre-translated column header string */
  colHeader: string;

  /** Whether the column supports sorting (defaults to false) */
  sortable?: boolean;

  /** Optional fixed width (e.g. '120px', '20%') */
  width?: string;
}

/**
 * Aggregated configuration for SlotListComponent.
 * Passed as a single input to keep the component interface clean.
 */
export interface SlotListConfig<T = any> {
  /** Column definitions */
  columns: SlotListColumn<T>[];

  /** Per-row action buttons (e.g. edit, delete). Omit or pass [] for read-only mode. */
  rowActions?: SlotRowActionConfig<T>[];

  /** Slot-level action buttons rendered below the list (e.g. add, import). */
  slotActions?: SlotButtonActionConfig[];

  /** Pre-translated message shown when the list is empty */
  noDataMessage?: string;

  /** Initial page size for the paginator (defaults to 25) */
  pageSize?: number;
}

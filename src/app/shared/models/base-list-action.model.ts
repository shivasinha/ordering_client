/**
 * Action definition used in BaseListComponent row buttons.
 */
export interface ActionConfig<T = any> {
  /** Material icon name (e.g., 'close', 'edit', 'delete') */
  icon: string;

  /** Tooltip text (already translated) */
  tooltip: string;

  /** Click handler for the action */
  handler: (item: T) => void;

  /** Conditional visibility (optional) */
  visible?: (item: T) => boolean;

  /** Additional CSS class for styling */
  cssClass?: string;
}

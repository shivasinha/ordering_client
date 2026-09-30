/**
 * Configuration interface for TextareaComponent.
 * Provides comprehensive options for customizing the textarea behavior and appearance.
 */
export interface TextareaConfig {
  /**
   * Label for the textarea field (translated string).
   */
  label: string;

  /**
   * Placeholder text for the textarea (translated string).
   */
  placeholder?: string;

  /**
   * Maximum character length allowed.
   * If not provided, no character limit is enforced and no counter is shown.
   */
  maxLength?: number;

  /**
   * Number of visible text lines.
   * @default 3
   */
  rows?: number;

  /**
   * Whether the field is required.
   * @default false
   */
  required?: boolean;

  /**
   * Whether the textarea is readonly.
   * @default false
   */
  readonly?: boolean;

  /**
   * Custom CSS class to apply to the form field.
   */
  cssClass?: string;

  /**
   * Whether to show the character counter.
   * Only shown if maxLength is provided.
   * @default true
   */
  showCounter?: boolean;

  /**
   * Material form field appearance.
   * @default 'outline'
   */
  appearance?: 'fill' | 'outline';

  /**
   * Whether the textarea should be resizable.
   * @default false
   */
  resizable?: boolean;

  /**
   * Minimum height for the textarea in pixels.
   */
  minHeight?: number;

  /**
   * Maximum height for the textarea in pixels.
   */
  maxHeight?: number;

  /**
   * Whether to trim the value before emitting.
   * @default false
   */
  trimValue?: boolean;

  /**
   * Custom hint text to display (translated string).
   */
  customHint?: string;

  /**
   * Alignment for hints.
   * @default 'start'
   */
  hintAlign?: 'start' | 'end';

  /**
   * Custom error message for max length validation (translated string).
   * Should contain {0} placeholder for max length value.
   * Example: "Maximum {0} characters allowed."
   */
  customMaxLengthError?: string;
}

export interface MultiChipAutocompleteConfig<T> {
  /** The label for the form field */
  label: string;
  /** The placeholder text for the input */
  placeholder: string;
  /** Whether the component is in readonly mode (default: false) */
  readonly?: boolean;
  /** Whether the field is required (default: false) */
  required?: boolean;
  /** Maximum number of selections allowed (default: 10) */
  maxSelections?: number;
  /** Whether duplicate selections are allowed (default: true) */
  allowDuplicates?: boolean;
  /** Array of options to choose from */
  options: T[];
  /** Property to display in the UI */
  displayProperty: keyof T;
  /** Property to use as the value */
  valueProperty: keyof T;
  /** Properties to search through when filtering */
  searchProperties: (keyof T)[];
  /** Whether to emit full objects or just values (default: true) */
  emitObjects?: boolean;
}

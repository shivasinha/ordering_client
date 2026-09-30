import { Component, forwardRef, OnInit, OnDestroy, signal, computed, input, ViewChild, ElementRef, output, inject } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject } from 'rxjs';
import { takeUntil, startWith, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { MultiChipAutocompleteConfig } from './multi-chip-autocomplete-config.interface';

@Component({
  selector: 'app-multi-chip-autocomplete',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SharedMaterialModule, TranslatePipe],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => MultiChipAutocompleteComponent),
      multi: true,
    },
  ],
  templateUrl: './multi-chip-autocomplete.component.html',
  styleUrl: './multi-chip-autocomplete.component.scss',
})
export class MultiChipAutocompleteComponent<T> implements ControlValueAccessor, OnInit, OnDestroy {
  protected tr: TranslationsService = inject(TranslationsService);

  // Config input - contains all configuration properties
  public config = input.required<MultiChipAutocompleteConfig<T>>();

  readonly selectionChange = output<T[]>();
  @ViewChild('chipInput', { static: false }) chipInput!: ElementRef<HTMLInputElement>;

  protected inputControl = new FormControl('');

  protected selectedValuesSig = signal<T[]>([]);
  private searchValueSig = signal<string>('');

  /**
   * Computed signal that checks if more selections can be added based on the maximum selection limit.
   * Returns true if more selections can be added, false if max limit reached.
   */
  protected canAddMoreSelections = computed(() => {
    const maxSelections = this.config().maxSelections ?? 10;
    return !maxSelections || this.selectedValuesSig().length < maxSelections;
  });

  protected filteredOptionsSig = computed(() => {
    let availableOptions = this.config().options;

    // Filter out already selected options if duplicates are not allowed
    if (!(this.config().allowDuplicates ?? true)) {
      const selectedValues = this.selectedValuesSig();
      const valueProperty = this.config().valueProperty;
      const selectedValueSet = new Set(selectedValues.map(option => option[valueProperty]));

      availableOptions = availableOptions.filter(option => !selectedValueSet.has(option[valueProperty]));
    }

    const filterValue = this.searchValueSig().toLowerCase().trim();

    if (!filterValue) {
      return availableOptions;
    }

    const searchTerms = filterValue.split(' ').filter(term => term.length > 0);

    return availableOptions.filter(option => this.matchesSearchTerms(option, searchTerms));
  });

  private destroy$ = new Subject<void>();
  private onChange: (value: (T | T[keyof T])[]) => void = () => {};
  private onTouched = () => {};

  /**
   * Initializes the component and sets up reactive search functionality.
   * Subscribes to input control value changes with debouncing and distinct filtering.
   */
  ngOnInit(): void {
    // Set up reactive search
    this.inputControl.valueChanges
      .pipe(takeUntil(this.destroy$), startWith(''), debounceTime(150), distinctUntilChanged())
      .subscribe(value => {
        this.searchValueSig.set(value || '');
      });
  }

  /**
   * Cleanup method called when the component is destroyed.
   * Completes the destroy subject to unsubscribe from all observables.
   */
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Implements ControlValueAccessor interface. Sets the value from the parent form control.
   * Maps incoming values to their corresponding option objects.
   * @param value - Array of values to set as selected, can be objects or primitive values
   */
  writeValue(value: (T | T[keyof T])[]): void {
    if (!value || !Array.isArray(value)) {
      this.selectedValuesSig.set([]);
      return;
    }

    const selectedOptions = value.map(val => this.mapValueToOption(val)).filter((option): option is T => option !== null); // Type guard to filter out null values
    this.selectedValuesSig.set(selectedOptions);
  }

  /**
   * Implements ControlValueAccessor interface. Registers the callback function
   * that will be called when the component's value changes.
   * @param fn - Callback function to register for value changes
   */
  registerOnChange(fn: (value: (T | T[keyof T])[]) => void): void {
    this.onChange = fn;
  }

  /**
   * Implements ControlValueAccessor interface. Registers the callback function
   * that will be called when the component is touched/blurred.
   * @param fn - Callback function to register for touch events
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Implements ControlValueAccessor interface. Sets the disabled state of the component.
   * @param isDisabled - Whether the component should be disabled
   */
  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.inputControl.disable();
    } else {
      this.inputControl.enable();
    }
  }

  /**
   * Removes a selected option from the selections.
   * Only removes the first matching instance if duplicates exist.
   * Does nothing if the component is in readonly mode.
   * @param optionToRemove - The option object to remove from selections
   */
  protected remove(optionToRemove: T): void {
    if (this.config().readonly) return;

    const currentSelections = this.selectedValuesSig();

    // Remove only the first matching instance
    const valueProperty = this.config().valueProperty;
    const indexToRemove = currentSelections.findIndex(option => option[valueProperty] === optionToRemove[valueProperty]);

    if (indexToRemove !== -1) {
      const updatedSelections = currentSelections.filter((_, index) => index !== indexToRemove);
      this.updateSelections(updatedSelections);
    }
  }

  /**
   * Handles autocomplete option selection event.
   * Adds the selected option to the selections if max selections hasn't been reached.
   * Clears the input field and deselects the option after processing.
   * @param event - The MatAutocompleteSelectedEvent containing the selected option
   */
  protected selected(event: MatAutocompleteSelectedEvent): void {
    if (this.canAddMoreSelections()) {
      this.addSelection(event.option.value);
    }

    this.clearInput();
    event.option.deselect();
  }

  /**
   * Gets the display value for an option using the configured display property.
   * @param option - The option object to get the display value from
   * @returns The string representation of the option's display property, or empty string if not found
   */
  protected getDisplayValue = (option: T): string => {
    if (!option) return '';
    const displayProp = this.config().displayProperty;
    return option[displayProp]?.toString() || '';
  };

  /**
   * Adds a new option to the current selections.
   * @param option - The option object to add to the selections
   */
  private addSelection(option: T): void {
    this.updateSelections([...this.selectedValuesSig(), option]);
  }

  /**
   * Updates the component's selections and emits change events.
   * Handles both object and value emission based on the emitObjects configuration.
   * @param selections - Array of selected option objects
   */
  private updateSelections(selections: T[]): void {
    this.selectedValuesSig.set(selections);
    // Emit the actual values based on emitObjects configuration
    const emitObjects = this.config().emitObjects ?? true;
    const valueProperty = this.config().valueProperty;
    const outputValues = selections.map(option => (emitObjects ? option : option[valueProperty]));
    this.onChange(outputValues);
    this.selectionChange.emit(selections);
    this.onTouched();
  }

  /**
   * Clears the input field and resets the search value.
   * Also ensures the native input element is cleared.
   */
  private clearInput(): void {
    this.inputControl.setValue('');
    this.searchValueSig.set('');

    // Also clear the native input element to ensure it's clean
    if (this.chipInput?.nativeElement) {
      this.chipInput.nativeElement.value = '';
    }
  }

  /**
   * Maps a value to its corresponding option object from the available options.
   * Handles both object values and primitive values.
   * @param val - The value to map, can be an object or primitive value
   * @returns The corresponding option object from the options array, or null if not found
   */
  private mapValueToOption(val: T | T[keyof T]): T | null {
    // If it's already a full object that exists in options, use it
    if (val && typeof val === 'object') {
      const valueProperty = this.config().valueProperty;
      const foundInOptions = this.config().options.find(option => option[valueProperty] === (val as T)[valueProperty]);
      if (foundInOptions) return foundInOptions;
    }

    // If it's a primitive value, find the corresponding option
    const valueProperty = this.config().valueProperty;
    const foundOption = this.config().options.find(option => option[valueProperty] === val);

    if (foundOption) return foundOption;

    // If no match found, return null (this will be filtered out)
    return null;
  }

  /**
   * Determines if an option matches all the provided search terms.
   * Searches across all configured search properties for each term.
   * @param option - The option object to check against search terms
   * @param searchTerms - Array of search terms that all must be found
   * @returns True if all search terms are found in any of the searchable properties
   */
  private matchesSearchTerms(option: T, searchTerms: string[]): boolean {
    const searchProperties = this.config().searchProperties;

    // Get all searchable values from the configured properties
    const searchableValues = searchProperties.map(prop => {
      return option[prop]?.toString().toLowerCase() || '';
    });

    // Check if all search terms are found in any of the searchable values
    return searchTerms.every(term => searchableValues.some(value => value.includes(term)));
  }
}

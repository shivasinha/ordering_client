import { Component, computed, effect, ElementRef, forwardRef, inject, input, signal, ViewChild } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TextareaConfig } from './textarea-config.interface';
import { TranslationsService } from '@Ordering/core/services/translations.service';

/**
 * A generic reusable textarea component with optional character limit and validation.
 * Implements ControlValueAccessor for seamless Angular form integration.
 *
 * Features:
 * - Optional character counting with configurable display
 * - Dynamic validation based on configuration
 * - Customizable appearance (outline, fill, standard)
 * - Resizable with min-height support
 * - Auto-focus capability
 * - Value trimming option
 * - Readonly and disabled state handling
 * - Accepts pre-translated strings (no internal translation)
 *
 * Usage:
 * ```typescript
 * config: TextareaConfig = {
 *   label: this.tr.translate('lblDescription'),
 *   placeholder: this.tr.translate('lblEnterDescription'),
 *   maxLength: 2000,
 *   rows: 4,
 *   required: true,
 *   appearance: 'outline'
 * };
 * ```
 *
 * ```html
 * <app-textarea
 *   [config]="config"
 *   [formControl]="descriptionControl"
 * ></app-textarea>
 * ```
 */
@Component({
  selector: 'app-textarea',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  templateUrl: './textarea.component.html',
  styleUrl: './textarea.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextareaComponent),
      multi: true,
    },
  ],
})
export class TextareaComponent implements ControlValueAccessor {
  @ViewChild('textareaElement') private textareaElement?: ElementRef<HTMLTextAreaElement>;
  /**
   * Configuration for the textarea component.
   */
  public readonly config = input.required<TextareaConfig>();

  /**
   * Whether the textarea is readonly.
   */
  public readonly readonly = input<boolean>(false);

  private readonly tr = inject(TranslationsService);
  protected readonly textAreaControl = new FormControl<string>('', { nonNullable: true });
  protected readonly isDisabled = signal<boolean>(false);
  protected readonly currentValue = signal<string>('');

  private onChange: (value: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  // Computed signals for config properties
  protected readonly label = computed(() => this.config().label);
  protected readonly placeholder = computed(() => this.config().placeholder ?? '');
  protected readonly maxLength = computed(() => this.config().maxLength ?? 2000);
  protected readonly rows = computed(() => this.config().rows ?? 3);
  protected readonly required = computed(() => this.config().required ?? false);
  protected readonly isReadonly = computed(() => this.readonly() || (this.config().readonly ?? false));
  protected readonly cssClass = computed(() => this.config().cssClass ?? '');
  protected readonly showCounter = computed(() => this.config().showCounter ?? true);
  protected readonly appearance = computed(() => this.config().appearance ?? 'outline');
  protected readonly resizable = computed(() => this.config().resizable ?? true);
  protected readonly minHeight = computed(() => this.config().minHeight ?? this.rows() * 24 + 16); // Approximate min height based on rows (24px per row + padding)
  protected readonly maxHeight = computed(() => this.config().maxHeight ?? 300);
  protected readonly customHint = computed(() => this.config().customHint);
  protected readonly hintAlign = computed(() => this.config().hintAlign ?? 'start');
  protected readonly characterCount = computed(() => this.currentValue().length);

  constructor() {
    // Effect to update validators when config changes
    effect(() => {
      this.updateValidators();
    });

    // Subscribe to value changes
    this.textAreaControl.valueChanges.subscribe(value => {
      let finalValue = value ?? '';

      // Update the current value signal
      this.currentValue.set(finalValue);

      // Trim value if configured
      if (this.config().trimValue) {
        finalValue = finalValue.trim();
      }

      // Emit empty string instead of null to maintain consistency with nonNullable FormControls
      this.onChange(finalValue);
    });
  }

  /**
   * Updates validators based on config changes.
   */
  private updateValidators(): void {
    const validators = [];

    if (this.required()) {
      validators.push(Validators.required);
    }

    if (this.maxLength() !== undefined) {
      validators.push(Validators.maxLength(this.maxLength()));
    }

    this.textAreaControl.setValidators(validators);
    this.textAreaControl.updateValueAndValidity();
  }

  /**
   * Gets the error message for max length validation.
   */
  protected getMaxLengthError(): string {
    return this.maxLength() !== undefined ? this.tr.translate('msgErrorMaxCharacterLimit').replace('{0}', this.maxLength().toString()) : '';
  }

  // ControlValueAccessor Implementation

  /**
   * Writes a new value to the element.
   */
  writeValue(value: string | null): void {
    const newValue = value ?? '';
    this.textAreaControl.setValue(newValue, { emitEvent: false });
    this.currentValue.set(newValue);
  }

  /**
   * Registers a callback function to be called when the textAreaControl's value changes.
   */
  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  /**
   * Registers a callback function to be called when the textAreaControl is touched.
   */
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  /**
   * Sets the disabled state of the textAreaControl.
   */
  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
    if (isDisabled) {
      this.textAreaControl.disable({ emitEvent: false });
    } else {
      this.textAreaControl.enable({ emitEvent: false });
    }
  }

  /**
   * Called when the textarea loses focus.
   */
  protected onBlur(): void {
    this.onTouched();
  }
}

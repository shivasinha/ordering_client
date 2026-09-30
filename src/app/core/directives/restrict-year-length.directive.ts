import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

/**
 * Angular directive that restricts the number of consecutive digits that can be entered into an input field.
 *
 * @remarks
 * This directive is typically used to limit year input fields to a specific number of digits (default: 4).
 * It intercepts keyboard input and paste events to prevent users from entering more consecutive digits
 * than allowed. Special keys (navigation, editing, and keyboard shortcuts) are still permitted.
 *
 * @example
 * ```html
 * <!-- Restrict to 4 consecutive digits (default) -->
 * <input type="text" appRestrictYearLength />
 *
 * <!-- Restrict to 2 consecutive digits -->
 * <input type="text" [appRestrictYearLength]="2" />
 * ```
 *
 * @publicApi
 */
@Directive({
  standalone: true,
  selector: '[appRestrictYearLength]',
})
export class RestrictYearLengthDirective {
  private el = inject(ElementRef);
  appRestrictYearLength = input(4, {
    transform: (value: number | string) => Number(value) || 4,
  });

  /**
   * Handles the `keydown` event to restrict the number of consecutive digits entered in an input field.
   *
   * - Allows special navigation and editing keys (e.g., Backspace, Delete, Tab, Escape, Enter, Arrow keys).
   * - Permits Ctrl/Cmd key combinations (e.g., copy, paste, select all).
   * - For digit keys, checks if the resulting value would exceed the allowed number of consecutive digits
   *   as specified by `appRestrictYearLength`. If so, prevents the input.
   *
   * @param event The keyboard event triggered by the user's key press.
   */
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    if (this.isAllowedKey(event)) {
      return;
    }

    if (this.isDigitKey(event.key)) {
      if (this.wouldExceedDigitLimit(event)) {
        event.preventDefault();
      }
    }
  }

  /**
   * Checks if the pressed key should be allowed (special keys or keyboard shortcuts).
   *
   * @private
   * @param {KeyboardEvent} event - The keyboard event to check
   * @returns {boolean} True if the key should be allowed, false otherwise
   */
  private isAllowedKey(event: KeyboardEvent): boolean {
    const specialKeys = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    return specialKeys.includes(event.key) || event.ctrlKey || event.metaKey;
  }

  /**
   * Checks if the given key is a digit (0-9).
   *
   * @private
   * @param {string} key - The key to check
   * @returns {boolean} True if the key is a digit, false otherwise
   */
  private isDigitKey(key: string): boolean {
    return /^\d$/.test(key);
  }

  /**
   * Determines if entering the digit would exceed the consecutive digit limit.
   *
   * @private
   * @param {KeyboardEvent} event - The keyboard event containing the digit to be entered
   * @returns {boolean} True if the resulting value would exceed the limit, false otherwise
   */
  private wouldExceedDigitLimit(event: KeyboardEvent): boolean {
    const input = this.el.nativeElement as HTMLInputElement;
    const newValue = this.calculateNewValue(input, event.key);
    return this.hasExcessiveConsecutiveDigits(newValue);
  }

  /**
   * Calculates what the input value would be after inserting a character.
   *
   * @private
   * @param {HTMLInputElement} input - The input element
   * @param {string} char - The character to insert
   * @returns {string} The resulting value after insertion
   */
  private calculateNewValue(input: HTMLInputElement, char: string): string {
    const currentValue = input.value || '';
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    return currentValue.substring(0, selectionStart) + char + currentValue.substring(selectionEnd);
  }

  /**
   * Checks if a value contains more consecutive digits than allowed.
   *
   * @private
   * @param {string} value - The value to check
   * @returns {boolean} True if the value exceeds the limit, false otherwise
   */
  private hasExcessiveConsecutiveDigits(value: string): boolean {
    return new RegExp(`\\d{${this.appRestrictYearLength() + 1},}`).test(value);
  }

  /**
   * Handles the paste event on an input element, restricting the number of consecutive digits
   * that can be inserted based on the `appRestrictYearLength` property.
   *
   * - Prevents the default paste behavior.
   * - Checks if the pasted text contains more than the allowed number of consecutive digits.
   *   If so, the paste is rejected.
   * - If allowed, inserts the pasted text at the current cursor position, ensuring the resulting
   *   value does not exceed the digit restriction.
   * - Updates the input value and cursor position, and dispatches an input event for Angular change detection.
   *
   * @param event The clipboard event triggered by pasting into the input element.
   */
  @HostListener('paste', ['$event'])
  onPaste(event: ClipboardEvent): void {
    event.preventDefault();

    const pastedText = event.clipboardData?.getData('text') || '';

    if (this.hasExcessiveConsecutiveDigits(pastedText)) {
      return;
    }

    const input = this.el.nativeElement as HTMLInputElement;
    const newValue = this.calculateNewValue(input, pastedText);

    if (!this.hasExcessiveConsecutiveDigits(newValue)) {
      this.applyPastedValue(input, pastedText);
    }
  }

  /**
   * Applies the pasted value to the input and updates the cursor position.
   *
   * @private
   * @param {HTMLInputElement} input - The input element
   * @param {string} pastedText - The text that was pasted
   */
  private applyPastedValue(input: HTMLInputElement, pastedText: string): void {
    const selectionStart = input.selectionStart || 0;
    const selectionEnd = input.selectionEnd || 0;
    const currentValue = input.value || '';

    input.value = currentValue.substring(0, selectionStart) + pastedText + currentValue.substring(selectionEnd);
    input.setSelectionRange(selectionStart + pastedText.length, selectionStart + pastedText.length);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

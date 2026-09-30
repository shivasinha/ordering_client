import { Component } from '@angular/core';
import { RestrictYearLengthDirective } from './restrict-year-length.directive';

export class MockDataTransfer {
  private data: Map<string, string> = new Map();

  setData(format: string, data: string): void {
    this.data.set(format, data);
  }

  getData(format: string): string {
    return this.data.get(format) || '';
  }
}

export class MockClipboardEvent extends Event {
  clipboardData: DataTransfer | null;

  constructor(type: string, eventInitDict?: ClipboardEventInit & { clipboardData?: DataTransfer }) {
    super(type, eventInitDict);
    this.clipboardData = eventInitDict?.clipboardData || null;
  }
}

@Component({
  template: '<input type="text" [appRestrictYearLength]="4">',
  standalone: true,
  imports: [RestrictYearLengthDirective],
})
export class TestComponent {}

// --- Refined Test Constants & Enums (Kept as is, they are good!) ---
export enum InputValue {
  EMPTY = '',
  DIGIT_2 = '12',
  DIGIT_3 = '123',
  DIGIT_4 = '1234',
  DIGIT_5 = '12345',
  DIGIT_6 = '123456',
  DIGIT_7 = '1234567',
  WITH_SEPARATOR = '1234-5678',
  WITH_SUFFIX = '1234abc',
  WITH_DASH = '1234-',
  LETTERS = 'abcd',
  SUFFIX = 'abc',
}

export enum KeyEvent {
  DIGIT_1 = '1',
  DIGIT_3 = '3',
  DIGIT_5 = '5',
  DIGIT_6 = '6',
  DIGIT_7 = '7',
  LETTER_A = 'a',
  LETTER_C = 'c',
  LETTER_V = 'v',
}

export enum PasteData {
  TWO_DIGITS = '34',
  THREE_DIGITS = '345',
  TWO_LETTERS_DIGITS = '56',
}

export enum EventType {
  KEYDOWN = 'keydown',
  PASTE = 'paste',
  INPUT = 'input',
}

export enum DataFormat {
  TEXT = 'text',
}

export enum CssSelector {
  INPUT = 'input',
}

export enum EventMethod {
  PREVENT_DEFAULT = 'preventDefault',
}

export const SPECIAL_KEYS = [
  'Backspace',
  'Delete',
  'Tab',
  'Escape',
  'Enter',
  'Home',
  'End',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
];

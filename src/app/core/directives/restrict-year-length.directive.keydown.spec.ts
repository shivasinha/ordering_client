import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  CssSelector,
  EventType,
  DataFormat,
  EventMethod,
  KeyEvent,
  MockClipboardEvent,
  MockDataTransfer,
  InputValue,
  SPECIAL_KEYS,
  TestComponent,
} from './restrict-year-length.directive.test-helper';

class TestHelpers {
  static setupInput(input: HTMLInputElement, value: string, start: number, end: number = start): void {
    input.value = value;
    input.setSelectionRange(start, end);
  }

  static createKeyboardEvent(key: string, options: Partial<KeyboardEventInit> = {}): KeyboardEvent {
    return new KeyboardEvent(EventType.KEYDOWN, { key, bubbles: true, cancelable: true, ...options });
  }

  static createPasteEvent(text: string): ClipboardEvent {
    const clipboardData = new DataTransfer();
    clipboardData.setData(DataFormat.TEXT, text);
    return new ClipboardEvent(EventType.PASTE, { clipboardData, bubbles: true });
  }

  static expectPreventDefault(input: HTMLInputElement, event: Event, shouldPrevent: boolean): void {
    const spy = jest.spyOn(event, EventMethod.PREVENT_DEFAULT);
    input.dispatchEvent(event);
    if (shouldPrevent) {
      expect(spy).toHaveBeenCalled();
    } else {
      expect(spy).not.toHaveBeenCalled();
    }
  }
}

// --- Global Setup/Teardown (Duplicated) ---
beforeAll(() => {
  (global as any).DataTransfer = MockDataTransfer;
  (global as any).ClipboardEvent = MockClipboardEvent;
});

afterAll(() => {
  delete (global as any).DataTransfer;
  delete (global as any).ClipboardEvent;
});

// --- Test Suite for Keydown Events ---
describe('RestrictYearLengthDirective - keydown events', () => {
  let fixture: ComponentFixture<TestComponent>;
  let inputNative: HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [TestComponent],
    }).createComponent(TestComponent);

    fixture.detectChanges();
    inputNative = fixture.debugElement.query(By.css(CssSelector.INPUT)).nativeElement;
  });

  it('should allow special keys (Backspace, Delete, Tab, etc.)', () => {
    SPECIAL_KEYS.forEach(key => {
      const event = TestHelpers.createKeyboardEvent(key);
      TestHelpers.expectPreventDefault(inputNative, event, false);
    });
  });

  const keydownTests = [
    {
      description: 'should allow Ctrl key combinations',
      initialValue: InputValue.EMPTY,
      keyToPress: KeyEvent.LETTER_C,
      options: { ctrlKey: true },
      shouldPrevent: false,
      selectionStart: 0,
      selectionEnd: 0,
    },
    {
      description: 'should allow Cmd (Meta) key combinations',
      initialValue: InputValue.EMPTY,
      keyToPress: KeyEvent.LETTER_V,
      options: { metaKey: true },
      shouldPrevent: false,
      selectionStart: 0,
      selectionEnd: 0,
    },
    {
      description: 'should allow entering up to 4 consecutive digits',
      initialValue: InputValue.DIGIT_2,
      keyToPress: KeyEvent.DIGIT_3,
      shouldPrevent: false,
      selectionStart: InputValue.DIGIT_2.length,
      selectionEnd: InputValue.DIGIT_2.length,
    },
    {
      description: 'should prevent entering more than 4 consecutive digits',
      initialValue: InputValue.DIGIT_4,
      keyToPress: KeyEvent.DIGIT_5,
      shouldPrevent: true,
      selectionStart: InputValue.DIGIT_4.length,
      selectionEnd: InputValue.DIGIT_4.length,
    },
    {
      description: 'should allow digits when separated by non-digit characters',
      initialValue: InputValue.WITH_DASH,
      keyToPress: KeyEvent.DIGIT_5,
      shouldPrevent: false,
      selectionStart: InputValue.WITH_DASH.length,
      selectionEnd: InputValue.WITH_DASH.length,
    },
    {
      description: 'should allow replacing selected text with a digit',
      initialValue: InputValue.DIGIT_5, // e.g., "12345"
      keyToPress: KeyEvent.DIGIT_6,
      shouldPrevent: false,
      selectionStart: 2, // Select "345"
      selectionEnd: 5,
    },
    {
      description: 'should allow digit input when selection replacement would not exceed limit',
      initialValue: InputValue.WITH_SUFFIX, // e.g., "1234abc"
      keyToPress: KeyEvent.DIGIT_5,
      shouldPrevent: false,
      selectionStart: 0, // Select "123"
      selectionEnd: 3,
    },
    {
      description: 'should allow non-digit keys',
      initialValue: InputValue.DIGIT_4,
      keyToPress: KeyEvent.LETTER_A,
      shouldPrevent: false,
      selectionStart: InputValue.DIGIT_4.length,
      selectionEnd: InputValue.DIGIT_4.length,
    },
    {
      description: 'should handle empty input',
      initialValue: InputValue.EMPTY,
      keyToPress: KeyEvent.DIGIT_1,
      shouldPrevent: false,
      selectionStart: 0,
      selectionEnd: 0,
    },
    {
      description: 'should handle insertion in the middle of text',
      initialValue: InputValue.DIGIT_2, // e.g., "12"
      keyToPress: KeyEvent.DIGIT_3,
      shouldPrevent: false,
      selectionStart: 1, // Between '1' and '2'
      selectionEnd: 1,
    },
  ];

  keydownTests.forEach(({ description, initialValue, keyToPress, options, shouldPrevent, selectionStart, selectionEnd }) => {
    it(description, () => {
      TestHelpers.setupInput(inputNative, initialValue, selectionStart, selectionEnd);
      const event = TestHelpers.createKeyboardEvent(keyToPress, options);
      TestHelpers.expectPreventDefault(inputNative, event, shouldPrevent);
    });
  });
});

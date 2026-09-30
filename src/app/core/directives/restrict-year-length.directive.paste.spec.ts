import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  CssSelector,
  EventType,
  DataFormat,
  EventMethod,
  MockClipboardEvent,
  MockDataTransfer,
  InputValue,
  PasteData,
  TestComponent,
} from './restrict-year-length.directive.test-helper';

// --- Test Helpers ---
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

// --- Test Suite for Paste Events ---
describe('RestrictYearLengthDirective - paste events', () => {
  let fixture: ComponentFixture<TestComponent>;
  let inputNative: HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [TestComponent],
    }).createComponent(TestComponent);

    fixture.detectChanges();
    inputNative = fixture.debugElement.query(By.css(CssSelector.INPUT)).nativeElement;
  });

  const pasteTests = [
    {
      description: 'should allow pasting text with up to 4 consecutive digits',
      initialValue: InputValue.EMPTY,
      pasteText: InputValue.DIGIT_4,
      expectedValue: InputValue.DIGIT_4,
      selectionStart: 0,
      selectionEnd: 0,
      expectInputEvent: true,
    },
    {
      description: 'should reject pasting text with more than 4 consecutive digits',
      initialValue: InputValue.EMPTY,
      pasteText: InputValue.DIGIT_5,
      expectedValue: InputValue.EMPTY,
      selectionStart: 0,
      selectionEnd: 0,
      expectInputEvent: false,
    },
    {
      description: 'should allow pasting text with digits separated by non-digits',
      initialValue: InputValue.EMPTY,
      pasteText: InputValue.WITH_SEPARATOR,
      expectedValue: InputValue.WITH_SEPARATOR,
      selectionStart: 0,
      selectionEnd: 0,
      expectInputEvent: true,
    },
    {
      description: 'should reject paste if result would have more than 4 consecutive digits',
      initialValue: InputValue.DIGIT_2, // "12"
      pasteText: PasteData.THREE_DIGITS, // "345" -> "12345" (too long)
      expectedValue: InputValue.DIGIT_2,
      selectionStart: InputValue.DIGIT_2.length,
      selectionEnd: InputValue.DIGIT_2.length,
      expectInputEvent: false,
    },
    {
      description: 'should allow paste if result stays within 4 consecutive digits',
      initialValue: InputValue.DIGIT_2, // "12"
      pasteText: PasteData.TWO_DIGITS, // "34" -> "1234" (ok)
      expectedValue: InputValue.DIGIT_4,
      selectionStart: InputValue.DIGIT_2.length,
      selectionEnd: InputValue.DIGIT_2.length,
      expectInputEvent: true,
    },
    {
      description: 'should replace selected text when pasting',
      initialValue: InputValue.WITH_SUFFIX, // "1234abc"
      pasteText: PasteData.TWO_LETTERS_DIGITS, // "56"
      expectedValue: PasteData.TWO_LETTERS_DIGITS + InputValue.SUFFIX, // "56abc"
      selectionStart: 0, // Select "1234"
      selectionEnd: InputValue.DIGIT_4.length,
      expectInputEvent: true,
    },
    {
      description: 'should allow pasting non-digit characters',
      initialValue: InputValue.EMPTY,
      pasteText: InputValue.LETTERS,
      expectedValue: InputValue.LETTERS,
      selectionStart: 0,
      selectionEnd: 0,
      expectInputEvent: true,
    },
  ];

  pasteTests.forEach(({ description, initialValue, pasteText, expectedValue, selectionStart, selectionEnd, expectInputEvent }) => {
    it(description, () => {
      TestHelpers.setupInput(inputNative, initialValue, selectionStart, selectionEnd);
      const inputEventSpy = jest.fn();
      inputNative.addEventListener(EventType.INPUT, inputEventSpy);

      inputNative.dispatchEvent(TestHelpers.createPasteEvent(pasteText));

      expect(inputNative.value).toBe(expectedValue);
      if (expectInputEvent) {
        expect(inputEventSpy).toHaveBeenCalled();
      } else {
        expect(inputEventSpy).not.toHaveBeenCalled();
      }
    });
  });

  it('should set cursor position after pasted text', () => {
    TestHelpers.setupInput(inputNative, InputValue.EMPTY, 0);
    inputNative.dispatchEvent(TestHelpers.createPasteEvent(InputValue.DIGIT_3));
    expect(inputNative.selectionStart).toBe(InputValue.DIGIT_3.length);
    expect(inputNative.selectionEnd).toBe(InputValue.DIGIT_3.length);
  });

  it('should handle null clipboard data', () => {
    TestHelpers.setupInput(inputNative, InputValue.DIGIT_3, InputValue.DIGIT_3.length);
    const event = new ClipboardEvent(EventType.PASTE, { bubbles: true });
    expect(() => inputNative.dispatchEvent(event)).not.toThrow();
  });

  it('should handle empty clipboard data', () => {
    TestHelpers.setupInput(inputNative, InputValue.DIGIT_3, InputValue.DIGIT_3.length);
    const inputEventSpy = jest.fn();
    inputNative.addEventListener(EventType.INPUT, inputEventSpy);

    inputNative.dispatchEvent(TestHelpers.createPasteEvent(InputValue.EMPTY));

    expect(inputNative.value).toBe(InputValue.DIGIT_3);
    expect(inputEventSpy).toHaveBeenCalled(); // Expecting it to be called based on previous debugging
  });
});

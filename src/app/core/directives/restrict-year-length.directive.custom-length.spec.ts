import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { RestrictYearLengthDirective } from './restrict-year-length.directive';

import {
  CssSelector,
  EventType,
  DataFormat,
  EventMethod,
  KeyEvent,
  MockClipboardEvent,
  MockDataTransfer,
  InputValue,
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

beforeAll(() => {
  (global as any).DataTransfer = MockDataTransfer;
  (global as any).ClipboardEvent = MockClipboardEvent;
});

afterAll(() => {
  delete (global as any).DataTransfer;
  delete (global as any).ClipboardEvent;
});

describe('RestrictYearLengthDirective - custom length', () => {
  @Component({
    template: '<input type="text" [appRestrictYearLength]="6">',
    standalone: true,
    imports: [RestrictYearLengthDirective],
  })
  class CustomLengthComponent {}

  let fixture: ComponentFixture<CustomLengthComponent>;
  let inputNative: HTMLInputElement;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({
      imports: [CustomLengthComponent],
    }).createComponent(CustomLengthComponent);

    fixture.detectChanges();
    inputNative = fixture.debugElement.query(By.css(CssSelector.INPUT)).nativeElement;
  });

  const customLengthKeydownTests = [
    {
      description: 'should allow up to 6 consecutive digits',
      initialValue: InputValue.DIGIT_5,
      keyToPress: KeyEvent.DIGIT_6,
      shouldPrevent: false,
      selectionStart: InputValue.DIGIT_5.length,
      selectionEnd: InputValue.DIGIT_5.length,
    },
    {
      description: 'should prevent more than 6 consecutive digits',
      initialValue: InputValue.DIGIT_6,
      keyToPress: KeyEvent.DIGIT_7,
      shouldPrevent: true,
      selectionStart: InputValue.DIGIT_6.length,
      selectionEnd: InputValue.DIGIT_6.length,
    },
  ];

  customLengthKeydownTests.forEach(({ description, initialValue, keyToPress, shouldPrevent, selectionStart, selectionEnd }) => {
    it(description, () => {
      TestHelpers.setupInput(inputNative, initialValue, selectionStart, selectionEnd);
      const event = TestHelpers.createKeyboardEvent(keyToPress);
      TestHelpers.expectPreventDefault(inputNative, event, shouldPrevent);
    });
  });

  const customLengthPasteTests = [
    {
      description: 'should allow pasting text with up to 6 consecutive digits',
      initialValue: InputValue.EMPTY,
      pasteText: InputValue.DIGIT_6,
      expectedValue: InputValue.DIGIT_6,
      selectionStart: 0,
      selectionEnd: 0,
      expectInputEvent: true,
    },
    {
      description: 'should reject pasting text with more than 6 consecutive digits',
      initialValue: InputValue.EMPTY,
      pasteText: InputValue.DIGIT_7,
      expectedValue: InputValue.EMPTY,
      selectionStart: 0,
      selectionEnd: 0,
      expectInputEvent: false,
    },
  ];

  customLengthPasteTests.forEach(
    ({ description, initialValue, pasteText, expectedValue, selectionStart, selectionEnd, expectInputEvent }) => {
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
    },
  );
});

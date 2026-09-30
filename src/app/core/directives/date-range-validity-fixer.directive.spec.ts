import { FormControlName } from '@angular/forms';
import { Subject } from 'rxjs';

import { DateRangeValidityFixerDirective } from './date-range-validity-fixer.directive';

// Test helpers
class TestHelpers {
  static readonly TEST_DATES = {
    DATE_1: new Date('2024-01-01'),
    DATE_2: new Date('2024-01-02'),
    DATE_3: new Date('2024-01-03'),
    CURRENT: new Date(),
  } as const;

  static createMockFormControl(): FormControlName {
    return {
      valueChanges: new Subject(),
      control: {
        updateValueAndValidity: jest.fn(),
      },
    } as any;
  }

  static createMockFormControlWithNullControl(): FormControlName {
    return {
      valueChanges: new Subject(),
      control: null,
    } as any;
  }

  static emitValueChange(control: FormControlName, value: Date): void {
    (control.valueChanges as Subject<any>).next(value);
  }

  static expectValidityUpdateCalled(control: FormControlName, times?: number): void {
    if (times !== undefined) {
      expect(control.control?.updateValueAndValidity).toHaveBeenCalledTimes(times);
    } else {
      expect(control.control?.updateValueAndValidity).toHaveBeenCalled();
    }
  }

  static expectValidityUpdateNotCalled(control: FormControlName): void {
    expect(control.control?.updateValueAndValidity).not.toHaveBeenCalled();
  }

  static waitForAsyncValidation(callback: () => void, done: jest.DoneCallback): void {
    setTimeout(() => {
      callback();
      done();
    }, 10);
  }

  static initializeAndTest(
    directive: DateRangeValidityFixerDirective,
    action: () => void,
    assertion: () => void,
    done: jest.DoneCallback,
  ): void {
    directive.ngAfterContentInit();
    action();
    this.waitForAsyncValidation(assertion, done);
  }
}

describe('DateRangeValidityFixerDirective', () => {
  let directive: DateRangeValidityFixerDirective;
  let startDateControl: FormControlName;
  let endDateControl: FormControlName;

  beforeEach(() => {
    directive = new DateRangeValidityFixerDirective();
    startDateControl = TestHelpers.createMockFormControl();
    endDateControl = TestHelpers.createMockFormControl();
    directive.startDateControlName = startDateControl;
    directive.endDateControlName = endDateControl;
  });

  afterEach(() => {
    directive.ngOnDestroy();
  });

  it('should create an instance', () => {
    const directive = new DateRangeValidityFixerDirective();
    expect(directive).toBeTruthy();
  });

  it('should set up subscriptions when both controls are available', () => {
    directive.ngAfterContentInit();

    expect(startDateControl.valueChanges).toBeDefined();
    expect(endDateControl.valueChanges).toBeDefined();
  });

  it('should update end date validity when start date changes', done => {
    TestHelpers.initializeAndTest(
      directive,
      () => TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.CURRENT),
      () => TestHelpers.expectValidityUpdateCalled(endDateControl),
      done,
    );
  });

  it('should update start date validity when end date changes', done => {
    TestHelpers.initializeAndTest(
      directive,
      () => TestHelpers.emitValueChange(endDateControl, TestHelpers.TEST_DATES.CURRENT),
      () => TestHelpers.expectValidityUpdateCalled(startDateControl),
      done,
    );
  });

  it('should not set up subscriptions when start date control is missing', done => {
    directive.startDateControlName = null as any;
    TestHelpers.initializeAndTest(
      directive,
      () => TestHelpers.emitValueChange(endDateControl, TestHelpers.TEST_DATES.CURRENT),
      () => TestHelpers.expectValidityUpdateNotCalled(startDateControl),
      done,
    );
  });

  it('should not set up subscriptions when end date control is missing', done => {
    directive.endDateControlName = null as any;
    TestHelpers.initializeAndTest(
      directive,
      () => TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.CURRENT),
      () => TestHelpers.expectValidityUpdateNotCalled(endDateControl),
      done,
    );
  });

  it('should unsubscribe from observables on destroy', done => {
    directive.ngAfterContentInit();

    const startSpy = jest.fn();
    const endSpy = jest.fn();

    (startDateControl.valueChanges as Subject<any>).subscribe(startSpy);
    (endDateControl.valueChanges as Subject<any>).subscribe(endSpy);

    directive.ngOnDestroy();

    TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.CURRENT);
    TestHelpers.emitValueChange(endDateControl, TestHelpers.TEST_DATES.CURRENT);

    TestHelpers.waitForAsyncValidation(() => {
      TestHelpers.expectValidityUpdateNotCalled(endDateControl);
      TestHelpers.expectValidityUpdateNotCalled(startDateControl);
    }, done);
  });

  it('should only trigger validation once for duplicate values', done => {
    TestHelpers.initializeAndTest(
      directive,
      () => {
        TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.DATE_1);
        TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.DATE_1);
        TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.DATE_1);
      },
      () => TestHelpers.expectValidityUpdateCalled(endDateControl, 1),
      done,
    );
  });

  it('should trigger validation for different values', done => {
    TestHelpers.initializeAndTest(
      directive,
      () => {
        TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.DATE_1);
        TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.DATE_2);
        TestHelpers.emitValueChange(startDateControl, TestHelpers.TEST_DATES.DATE_3);
      },
      () => TestHelpers.expectValidityUpdateCalled(endDateControl, 3),
      done,
    );
  });

  it('should handle null control references gracefully', done => {
    directive.startDateControlName = TestHelpers.createMockFormControlWithNullControl();
    directive.endDateControlName = TestHelpers.createMockFormControlWithNullControl();

    directive.ngAfterContentInit();

    expect(() => {
      TestHelpers.emitValueChange(directive.startDateControlName, TestHelpers.TEST_DATES.CURRENT);
      TestHelpers.emitValueChange(directive.endDateControlName, TestHelpers.TEST_DATES.CURRENT);
    }).not.toThrow();

    TestHelpers.waitForAsyncValidation(() => {}, done);
  });

  it('should complete the destroyed$ subject on destroy', () => {
    const completeSpy = jest.fn();
    (directive as any).destroyed$.subscribe({ complete: completeSpy });

    directive.ngOnDestroy();

    expect(completeSpy).toHaveBeenCalled();
  });
});

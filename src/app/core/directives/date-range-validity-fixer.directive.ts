import { AfterContentInit, ContentChild, Directive, OnDestroy } from '@angular/core';
import { FormControlName } from '@angular/forms';
import { MatEndDate, MatStartDate } from '@angular/material/datepicker';

import { distinctUntilChanged, Subject, takeUntil } from 'rxjs';

/**
 * Directive that fixes value and validity updates for Material date range pickers.
 *
 * This directive ensures that when either the start date or end date in a Material date range
 * picker changes, the validity of the other date control is automatically updated. This is
 * necessary because Angular Material's date range picker may not automatically trigger
 * validation updates on the opposite control when one date changes.
 *
 * @remarks
 * - The directive is need because of an issue in Angular Material where date range controls do not
 * clears errors after manuel input. See: https://github.com/angular/components/issues/21875
 *
 * - The directive uses `setTimeout` to defer the `updateValueAndValidity()` calls, allowing
 * the change detection cycle to complete before triggering validation updates.
 *
 * @example
 * ```html
 * <mat-date-range-input appUpdateDateRangeValueAndValidityFixer>
 *   <input matStartDate formControlName="startDate">
 *   <input matEndDate formControlName="endDate">
 * </mat-date-range-input>
 * ```
 */
@Directive({
  selector: '[appDateRangeValidityFixer]',
  standalone: true,
})
export class DateRangeValidityFixerDirective implements AfterContentInit, OnDestroy {
  @ContentChild(MatStartDate, { read: FormControlName }) startDateControlName!: FormControlName;
  @ContentChild(MatEndDate, { read: FormControlName }) endDateControlName!: FormControlName;

  private readonly destroyed$ = new Subject<void>();

  ngAfterContentInit(): void {
    if (this.startDateControlName?.valueChanges && this.endDateControlName?.valueChanges) {
      this.startDateControlName.valueChanges
        .pipe(distinctUntilChanged(), takeUntil(this.destroyed$))
        .subscribe(() => setTimeout(() => this.endDateControlName.control?.updateValueAndValidity()));

      this.endDateControlName.valueChanges
        .pipe(distinctUntilChanged(), takeUntil(this.destroyed$))
        .subscribe(() => setTimeout(() => this.startDateControlName.control?.updateValueAndValidity()));
    }
  }

  ngOnDestroy(): void {
    this.destroyed$.next();
    this.destroyed$.complete();
  }
}

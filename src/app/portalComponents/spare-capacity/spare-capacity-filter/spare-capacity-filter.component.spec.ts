// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import dayjs from 'dayjs';

import { SpareCapacityFilterComponent } from './spare-capacity-filter.component';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { TranslationsService } from '@Ordering/core/services/translations.service';
import { INITIAL_SPARE_CAPACITY_FILTER } from '../models/spare-capacity-filter.model';
import { provideDayjsDateAdapter } from '@Ordering/utils/dayjs-date-adapter-provider';
import { SpareCapacityFilters } from '@Ordering/api';

describe('SpareCapacityFilterComponent', () => {
  let component: SpareCapacityFilterComponent;
  let fixture: ComponentFixture<SpareCapacityFilterComponent>;

  beforeEach(async () => {
    const mockTranslationsService = {
      translate: jest.fn(key => key),
    };

    await TestBed.configureTestingModule({
      imports: [SpareCapacityFilterComponent, ReactiveFormsModule, SharedMaterialModule, NoopAnimationsModule],
      providers: [
        provideDayjsDateAdapter(),
        {
          provide: TranslatePipe,
          useValue: { transform: jest.fn(key => key) },
        },
        {
          provide: TranslationsService,
          useValue: mockTranslationsService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpareCapacityFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize form with default filter values', () => {
    expect(component['filterForm'].value).toEqual({
      trainId: INITIAL_SPARE_CAPACITY_FILTER.trainId,
      dateRange: { beginDate: undefined, endDate: undefined },
      fromStation: INITIAL_SPARE_CAPACITY_FILTER.fromStation,
      toStation: INITIAL_SPARE_CAPACITY_FILTER.toStation,
    });
  });

  describe('Filter changes', () => {
    it('should emit filter change when train ID is updated', done => {
      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.trainId).toBe(1001);
        done();
      });

      component['filterForm'].patchValue({ trainId: 1001 });
    });

    it('should emit filter change when date range is updated', done => {
      const testBeginDate = new Date('2025-11-01');
      const testEndDate = new Date('2025-11-15');

      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.dateRange?.beginDate).toBe('2025-11-01');
        expect(filters.dateRange?.endDate).toBe('2025-11-15');
        done();
      });

      component['filterForm'].patchValue({ dateRange: { beginDate: testBeginDate, endDate: testEndDate } });
    });

    it('should emit filter change when fromStation is updated', done => {
      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.fromStation).toBe('Berlin');
        done();
      });

      component['filterForm'].patchValue({ fromStation: 'Berlin' });
    });

    it('should emit filter change when toStation is updated', done => {
      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.toStation).toBe('Munich');
        done();
      });

      component['filterForm'].patchValue({ toStation: 'Munich' });
    });

    it('should trim whitespace from station names', done => {
      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.fromStation).toBe('Berlin');
        expect(filters.toStation).toBe('Munich');
        done();
      });

      component['filterForm'].patchValue({
        fromStation: '  Berlin  ',
        toStation: '  Munich  ',
      });
    });

    it('should convert empty strings to undefined', done => {
      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.dateRange?.beginDate).toBeUndefined();
        expect(filters.dateRange?.endDate).toBeUndefined();
        expect(filters.fromStation).toBeUndefined();
        done();
      });

      component['filterForm'].patchValue({
        dateRange: { beginDate: null, endDate: null },
        fromStation: '',
      });
    });

    it('should convert null values to undefined', done => {
      component.filterChange.subscribe((filters: SpareCapacityFilters) => {
        expect(filters.trainId).toBeUndefined();
        done();
      });

      component['filterForm'].patchValue({ trainId: null });
    });
  });

  describe('resetFilters', () => {
    it('should reset form to initial values', () => {
      // Change some values
      component['filterForm'].patchValue({
        trainId: 1001,
        dateRange: { beginDate: new Date('2025-11-01'), endDate: new Date('2025-11-15') },
        fromStation: 'Berlin',
        toStation: 'Munich',
      });

      // Reset
      component['resetFilters']();

      // Form reset uses null for cleared values, dateRange is nonNullable so uses its reset value
      expect(component['filterForm'].value).toEqual({
        trainId: null,
        dateRange: { beginDate: undefined, endDate: undefined },
        fromStation: null,
        toStation: null,
      });
    });
  });

  describe('initialFilters input', () => {
    it('should update form when initialFilters change', () => {
      const newFilters: SpareCapacityFilters = {
        trainId: 2001,
        dateRange: {
          beginDate: '2025-12-01',
          endDate: '2025-12-15',
        },
        fromStation: 'Hamburg',
        toStation: 'Frankfurt',
      };

      // Set input using ComponentRef
      fixture.componentRef.setInput('initialFilters', newFilters);
      fixture.detectChanges();

      // Form stores Date objects, not strings
      const formValue = component['filterForm'].value;
      expect(formValue.trainId).toBe(2001);
      expect(formValue.fromStation).toBe('Hamburg');
      expect(formValue.toStation).toBe('Frankfurt');
      // Dates are parsed from string to Date objects inside dateRange
      expect(dayjs(formValue.dateRange?.beginDate).format('YYYY-MM-DD')).toBe('2025-12-01');
      expect(dayjs(formValue.dateRange?.endDate).format('YYYY-MM-DD')).toBe('2025-12-15');
    });
  });

  describe('debouncing', () => {
    it('should debounce filter changes', () => {
      jest.useFakeTimers();

      // Recreate component with fake timers active so debounceTime is controlled
      const fakeFixture = TestBed.createComponent(SpareCapacityFilterComponent);
      const fakeComponent = fakeFixture.componentInstance;
      fakeFixture.detectChanges();

      let emitCount = 0;

      fakeComponent.filterChange.subscribe(() => {
        emitCount++;
      });

      // Rapidly change values
      fakeComponent['filterForm'].patchValue({ trainId: 1 });
      fakeComponent['filterForm'].patchValue({ trainId: 2 });
      fakeComponent['filterForm'].patchValue({ trainId: 3 });

      // Should not emit immediately
      expect(emitCount).toBe(0);

      // Advance the clock past the debounce duration
      jest.advanceTimersByTime(400);
      expect(emitCount).toBe(1); // Now it should have emitted once

      fakeFixture.destroy();
      jest.useRealTimers();
    });
  });
});

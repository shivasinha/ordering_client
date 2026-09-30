import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

import { CalendarDisplayData, DayOption, CalendarMonth } from '@Ordering/portalComponents/operating-days/operating-days.model';
import { OperatingDaysCalendarComponent } from './operating-days-calendar.component';

describe('OperatingDaysCalendarComponent', () => {
  let component: OperatingDaysCalendarComponent;
  let fixture: ComponentFixture<OperatingDaysCalendarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OperatingDaysCalendarComponent, ScrollingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(OperatingDaysCalendarComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have default empty calendar data', () => {
    fixture.detectChanges();

    const calendarData = component.calendarData();
    expect(calendarData.months).toHaveLength(0);
    expect(calendarData.allDaysNames).toBeDefined();
  });

  it('should handle calendar data with months', () => {
    const testCalendarData: CalendarDisplayData = {
      months: [
        {
          name: 'January 2024',
          days: [
            {
              id: 1,
              date: '2024-01-01',
              active: true,
              isSelectedOrSavedBitmap: false,
              isDeselectedOrInvalidSelection: false,
              isNewBitMap: false,
              displayText: '1',
            },
            {
              id: 2,
              date: '2024-01-02',
              active: false,
              isSelectedOrSavedBitmap: false,
              isDeselectedOrInvalidSelection: false,
              isNewBitMap: false,
              displayText: '2',
            },
          ],
        },
      ],
      allDaysNames: DayOption.getAllDaysNames(),
    };

    // Set input using the component's fixture
    fixture.componentRef.setInput('calendarData', testCalendarData);
    fixture.detectChanges();

    const calendarData = component.calendarData();
    expect(calendarData.months).toHaveLength(1);
    expect(calendarData.months[0].name).toBe('January 2024');
    expect(calendarData.months[0].days).toHaveLength(2);
  });

  it('should track months by name', () => {
    const month: CalendarMonth = {
      name: 'January 2024',
      days: [
        {
          id: 1,
          date: '2024-01-01',
          active: true,
          isSelectedOrSavedBitmap: false,
          isDeselectedOrInvalidSelection: false,
          isNewBitMap: false,
          displayText: '1',
        },
      ],
    };

    const result = component.trackByMonth(0, month);
    expect(result).toBe('January 2024');
  });
  it('should apply correct CSS classes based on bitmap flags', async () => {
    const testCalendarData: CalendarDisplayData = {
      months: [
        {
          name: 'January 2024',
          days: [
            {
              id: 1,
              date: '2024-01-01',
              active: true,
              isSelectedOrSavedBitmap: true,
              isDeselectedOrInvalidSelection: false,
              isNewBitMap: false,
              displayText: '1',
            },
            {
              id: 2,
              date: '2024-01-02',
              active: false,
              isSelectedOrSavedBitmap: false,
              isDeselectedOrInvalidSelection: true,
              isNewBitMap: false,
              displayText: '2',
            },
            {
              id: 3,
              date: '2024-01-03',
              active: true,
              isSelectedOrSavedBitmap: false,
              isDeselectedOrInvalidSelection: false,
              isNewBitMap: true,
              displayText: '3',
            },
            {
              id: 4,
              date: '2024-01-04',
              active: false,
              isSelectedOrSavedBitmap: false,
              isDeselectedOrInvalidSelection: false,
              isNewBitMap: false,
              displayText: '4',
            },
          ],
        },
      ],
      allDaysNames: DayOption.getAllDaysNames(),
    };

    fixture.componentRef.setInput('calendarData', testCalendarData);
    fixture.detectChanges();
    await fixture.whenStable();

    // Access the viewport and set its size to ensure rendering
    const viewport = fixture.debugElement.query(By.css('cdk-virtual-scroll-viewport')).componentInstance as CdkVirtualScrollViewport;
    viewport.elementRef.nativeElement.style.width = '1000px';
    viewport.elementRef.nativeElement.style.height = '500px';
    viewport.checkViewportSize();
    fixture.detectChanges();
    await fixture.whenStable();

    const daySpans = fixture.nativeElement.querySelectorAll('.days span');

    expect(daySpans.length).toBe(4);

    // First day: active and saved-selected-bitmap
    expect(daySpans[0].classList.contains('active')).toBe(true);
    expect(daySpans[0].classList.contains('saved-selected-bitmap')).toBe(true);
    expect(daySpans[0].classList.contains('invalid-deselected-bitmap')).toBe(false);
    expect(daySpans[0].classList.contains('new-bitmap')).toBe(false);

    // Second day: inactive and invalid-deselected-bitmap
    expect(daySpans[1].classList.contains('inactive')).toBe(true);
    expect(daySpans[1].classList.contains('saved-selected-bitmap')).toBe(false);
    expect(daySpans[1].classList.contains('invalid-deselected-bitmap')).toBe(true);
    expect(daySpans[1].classList.contains('new-bitmap')).toBe(false);

    // Third day: active and new-bitmap
    expect(daySpans[2].classList.contains('active')).toBe(true);
    expect(daySpans[2].classList.contains('saved-selected-bitmap')).toBe(false);
    expect(daySpans[2].classList.contains('invalid-deselected-bitmap')).toBe(false);
    expect(daySpans[2].classList.contains('new-bitmap')).toBe(true);

    // Fourth day: inactive with no special flags
    expect(daySpans[3].classList.contains('inactive')).toBe(true);
    expect(daySpans[3].classList.contains('saved-selected-bitmap')).toBe(false);
    expect(daySpans[3].classList.contains('invalid-deselected-bitmap')).toBe(false);
    expect(daySpans[3].classList.contains('new-bitmap')).toBe(false);
  });
});

import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';

import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { CalendarMonth, CalendarDisplayData } from '@Ordering/portalComponents/operating-days/operating-days.model';

@Component({
  selector: 'app-operating-days-calendar',
  templateUrl: './operating-days-calendar.component.html',
  styleUrls: ['./operating-days-calendar.component.scss'],
  imports: [CommonModule, ScrollingModule, SharedMaterialModule],
})
export class OperatingDaysCalendarComponent {
  // Single input for all pre-computed calendar data with styling information
  readonly calendarData = input<CalendarDisplayData>({ months: [], allDaysNames: [] });

  /**
   * TrackBy function for virtual scrolling optimization
   */
  trackByMonth(index: number, month: CalendarMonth): string {
    return month.name;
  }
}

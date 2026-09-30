import { DAYJS_DATE_FORMATS } from './dayjs-date-adapter-provider';
import { DateTimeFormat } from './dates';

describe('DAYJS_DATE_FORMATS', () => {
  it('should expose UI format for display.dateInput', () => {
    expect(DAYJS_DATE_FORMATS.display.dateInput).toBe(DateTimeFormat.UI_DATE_FORMAT);
  });

  it('should use UI format array for parse.dateInput', () => {
    expect(DAYJS_DATE_FORMATS.parse.dateInput).toContain(DateTimeFormat.UI_DATE_FORMAT);
  });

  it('should have monthYearLabel aligned with DateTimeFormat', () => {
    expect(DAYJS_DATE_FORMATS.display.monthYearLabel).toBe(DateTimeFormat.monthYearLabel);
  });
});

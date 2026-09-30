import { createCustomDateFormats } from './custom-date-formats';
import { DateTimeFormat } from './dates';
import { getLocaleDateFormat } from './dayjs-config';

describe('createCustomDateFormats', () => {
  const savedEnvironment = window.environment;

  afterEach(() => {
    window.environment = savedEnvironment;
  });

  it('should expose locale-aware format for display.dateInput', () => {
    const formats = createCustomDateFormats();
    const expectedFormat = getLocaleDateFormat();
    expect(formats.display.dateInput).toBe(expectedFormat);
  });

  it('should set parse.dateInput to the locale-aware format', () => {
    const formats = createCustomDateFormats();
    const expectedFormat = getLocaleDateFormat();
    expect(formats.parse.dateInput).toBe(expectedFormat);
  });

  it('should have monthYearLabel aligned with DateTimeFormat', () => {
    const formats = createCustomDateFormats();
    expect(formats.display.monthYearLabel).toBe(DateTimeFormat.monthYearLabel);
  });

  it('should use Serbian format when environment locale is sr-Latn-RS', () => {
    window.environment = { locale: 'sr-Latn-RS' };
    const formats = createCustomDateFormats();
    // Serbian dayjs 'L' format is 'D. M. YYYY.'
    expect(formats.display.dateInput).toBe('D. M. YYYY.');
    expect(formats.display.dateA11yLabel).toBe('D. M. YYYY.');
    expect(formats.parse.dateInput).toBe('D. M. YYYY.');
  });

  it('should use Slovenian format when environment locale is sl-SI', () => {
    window.environment = { locale: 'sl-SI' };
    const formats = createCustomDateFormats();
    expect(formats.display.dateInput).toBe('DD.MM.YYYY');
    expect(formats.parse.dateInput).toBe('DD.MM.YYYY');
  });

  it('should fall back to DD/MM/YYYY when environment is undefined', () => {
    window.environment = undefined;
    const formats = createCustomDateFormats();
    expect(formats.display.dateInput).toBe('DD/MM/YYYY');
  });

  it('should always include monthYear accessibility label', () => {
    const formats = createCustomDateFormats();
    expect(formats.display.monthYearA11yLabel).toBe(DateTimeFormat.monthYear);
  });
});

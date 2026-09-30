import { Pipe, PipeTransform } from '@angular/core';
import { DatePipe } from '@angular/common';
import { getLocaleDateFormat, getEnvironmentLocale } from '@Ordering/utils/dayjs-config';
import { convertToStandardLocale } from '@Ordering/utils/locale-mapping';

@Pipe({
  name: 'date', // Override the built-in date pipe
  pure: true,
  standalone: true,
})
export class CustomDatePipe extends DatePipe implements PipeTransform {
  private convertDayjsToAngularFormat(format: string): string {
    // Convert dayjs format tokens to Angular DatePipe format tokens.
    // Order matters: replace double tokens (DD) before single ones (D)
    // to avoid double-substitution.
    return format
      .replace(/DD/g, 'dd') // Day: DD -> dd
      .replace(/\bD\b/g, 'd') // Day: D -> d  (e.g. Serbian 'sr' locale uses 'D. M. YYYY.')
      .replace(/YYYY/g, 'yyyy') // Year: YYYY -> yyyy
      .replace(/\bA\b/g, 'a'); // AM/PM: A -> a (word boundary to avoid replacing A in other contexts)
  }

  override transform(value: any, format?: string, timezone?: string, locale?: string): any {
    const finalFormat = this.convertDayjsToAngularFormat(format || getLocaleDateFormat());
    // Map internal locale codes (e.g. 'e', 'sr-Latn') to standard codes Angular understands,
    // then fall back to the runtime formatting locale from environment.
    // Both paths use the same source (window.environment?.locale) via getEnvironmentLocale()
    // to avoid duplicating the raw window access.
    const rawLocale = locale || getEnvironmentLocale();
    const effectiveLocale = convertToStandardLocale(rawLocale);
    return super.transform(value, finalFormat, timezone, effectiveLocale);
  }
}

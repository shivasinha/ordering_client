import { Injectable, Pipe, PipeTransform, inject } from '@angular/core';
import { sortDayNumbersByEnumOrder } from '@Ordering/portalComponents/operating-days/operating-days.util';
import { TranslationsService } from '@Ordering/core/services/translations.service';

@Injectable({ providedIn: 'root' })
@Pipe({
  name: 'dayNumbersToNames',
  standalone: true,
  pure: true, // This ensures the pipe only runs when input changes
})
export class DayNumbersToNamesPipe implements PipeTransform {
  private tr = inject(TranslationsService);

  /**
   * Transforms an array of day numbers to a comma-separated string of translated day names.
   * Uses the TranslationsService.translateEnumValue() method to handle enum translation.
   *
   * @param dayNumbers - Array of day numbers to transform
   * @returns Comma-separated string of translated day names sorted by enum order
   *
   * @example
   * ```typescript
   * {{ [1, 2, 3] | dayNumbersToNames }}
   * // Output: "Pon, Tor, Sre" (in Slovenian) or "Mon, Tue, Wed" (in English)
   * ```
   */
  transform(dayNumbers: number[] | undefined): string {
    if (!dayNumbers || dayNumbers.length === 0) {
      return '';
    }

    const sortedDayNumbers = sortDayNumbersByEnumOrder(dayNumbers);
    const sortedMappedDays = sortedDayNumbers
      .map(dayValue => this.tr.translateEnumValue(dayValue, 'DayOptionNames', true))
      .filter(dayName => dayName !== undefined && dayName !== '');

    return sortedMappedDays.join(', ');
  }
}

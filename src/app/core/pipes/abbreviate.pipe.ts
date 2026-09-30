import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'abbreviate',
  standalone: true,
})

/**
 * Pipe that abbreviates a given string to a specified maximum length.
 * If the string exceeds the maximum length, it will be truncated and appended with '...'.
 * The pipe attempts to truncate at the last space within the limit to avoid breaking words.
 *
 * @example
 * ```HTML
 * <p>{{ 'This is a long string' | abbreviate:10 }}</p>
 * ```
 *
 * @param {string} value - The string to be abbreviated.
 * @param {number} maxLen - The maximum length of the abbreviated string including the ellipsis.
 * @returns {string} The abbreviated string if it exceeds the maximum length, otherwise the original string.
 */
export class AbbreviatePipe implements PipeTransform {
  transform(value: string, maxLen: number): string {
    const abbrevChars: string = '...';
    const defaultSplitLimit: number = maxLen - abbrevChars.length;
    const lastSpaceLimit: number = defaultSplitLimit - 2; // up to what length to prefer the last space as splitpoint

    if (value && value.length > maxLen) {
      let tmpValue: string = value;
      let splitIdx: number = 0;
      do {
        splitIdx = tmpValue.lastIndexOf(' ');
        if (splitIdx > lastSpaceLimit) {
          tmpValue = tmpValue.substring(0, splitIdx - 1);
        }
      } while (splitIdx > lastSpaceLimit);
      splitIdx = splitIdx > 0 && splitIdx <= lastSpaceLimit ? splitIdx + 1 : defaultSplitLimit;
      return value.substring(0, splitIdx) + abbrevChars;
    }
    return value;
  }
}

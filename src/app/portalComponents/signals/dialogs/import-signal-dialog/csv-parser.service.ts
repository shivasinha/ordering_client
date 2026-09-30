import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { NgxCsvParser, NgxCSVParserError } from 'ngx-csv-parser';

/**
 * Parses a CSV file into a list of ImportedSignalRow objects.
 * Handles ngx-csv-parser invocation and raw-row transformation.
 */
@Injectable({ providedIn: 'root' })
export class CSVParserService {
  private readonly csvParser = inject(NgxCsvParser);

  /**
   * Parses a comma-delimited CSV file and returns the non-empty signal rows.
   * Emits an empty array when the file is unparseable.
   * @param {File} file - The CSV file to parse.
   * @returns {Observable<signal[]>} Parsed and filtered rows.
   */
  public parse(file: File): Observable<string[]> {
    return this.csvParser.parse(file, { header: false, delimiter: ',' }).pipe(
      map(value => {
        if (value instanceof NgxCSVParserError || !Array.isArray(value)) {
          return [];
        }
        return value[0];
      }),
    );
  }
}

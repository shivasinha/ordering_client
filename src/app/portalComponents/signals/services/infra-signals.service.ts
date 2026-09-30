import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { defaultIfEmpty, map } from 'rxjs/operators';

import { AdminDataEntry, InfraSignalsList, InfraSignalsSearchRequest, MasterDataService } from '@Ordering/api';
import { ImportedSignalValidationResult } from '@Ordering/shared/models/infra-signal.model';
import { TranslationsService } from '@Ordering/core/services/translations.service';

/**
 * Provides signal-related operations that do not fit the list-container pattern:
 * currently batch validation for CSV import (maps CSV rows to BE signals).
 */
@Injectable({
  providedIn: 'root',
})
export class InfraSignalsService {
  private readonly masterDataService = inject(MasterDataService);
  private readonly tr = inject(TranslationsService);

  /**
   * Searches for infrastructure signals based on the provided request.
   * @param {InfraSignalsSearchRequest} request - Filters and optional pagination to pass to the API.
   * @returns {Observable<InfraSignalsList>} The raw paginated signal list.
   */
  public searchSignals(request: InfraSignalsSearchRequest): Observable<InfraSignalsList> {
    return this.masterDataService.searchInfraSignals(request);
  }

  /**
   * Validates an array of imported CSV rows against the backend signal catalog.
   * Sends all display names in a single request and maps each row to OK/NOT_FOUND.
   * @param {string[]} rows - Rows parsed from the CSV file.
   * @returns {Observable<ImportedSignalValidationResult[]>} Validation result per row.
   */
  public validateImportedSignals(rows: string[]): Observable<ImportedSignalValidationResult[]> {
    const request: InfraSignalsSearchRequest = { filters: { display: rows } };
    return this.searchSignals(request).pipe(
      map(response => {
        const byDisplay = new Map<string, AdminDataEntry>();
        for (const entry of response.items) {
          if (!byDisplay.has(entry.display)) {
            byDisplay.set(entry.display, entry);
          }
        }
        return rows.map(row => {
          const signal = byDisplay.get(row);
          return signal
            ? { area: row, status: this.tr.translate('lblOk'), signal }
            : { area: row, status: this.tr.translate('lblUnknown') };
        });
      }),
      defaultIfEmpty([]),
    );
  }
}

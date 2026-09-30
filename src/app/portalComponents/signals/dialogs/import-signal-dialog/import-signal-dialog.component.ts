import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { first, switchMap } from 'rxjs';

import { CSVParserService } from './csv-parser.service';

import { TranslatePipe } from '@Ordering/core/pipes/translate.pipe';
import { SharedMaterialModule } from '@Ordering/shared/shared-material.module';
import { InfraSignalsService } from '@Ordering/portalComponents/signals/services/infra-signals.service';
import { ImportedSignalValidationResult } from '@Ordering/shared/models/infra-signal.model';
import { ImportSignalDialogResult } from '@Ordering/portalComponents/signals/signal-dialog.model';

@Component({
  selector: 'app-import-signal-dialog',
  imports: [CommonModule, SharedMaterialModule, MatDialogModule, TranslatePipe],
  templateUrl: './import-signal-dialog.component.html',
  styleUrl: './import-signal-dialog.component.scss',
})
export class ImportSignalDialogComponent {
  private readonly csvParserService = inject(CSVParserService);
  private readonly infraSignalsService = inject(InfraSignalsService);

  protected readonly dialogRef = inject(MatDialogRef<ImportSignalDialogComponent, ImportSignalDialogResult | undefined>);

  protected readonly selectedFile = signal<File | null>(null);
  protected readonly results = signal<ImportedSignalValidationResult[]>([]);
  protected readonly isProcessing = signal(false);

  protected readonly canStart = computed(() => !!this.selectedFile() && !this.isProcessing() && this.results().length === 0);
  protected readonly hasProcessedResults = computed(() => this.results().length > 0);
  protected readonly acceptedSignals = computed(() =>
    this.results()
      .map(item => item.signal)
      .filter(item => !!item),
  );

  /**
   * Handles the file input change event.
   * Validates the selected file and updates the state accordingly.
   * @param {Event} event - The file input change event.
   * @returns {void}
   */
  protected onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0] ?? null;

    if (!file || !file.name.toLowerCase().endsWith('.csv')) {
      this.selectedFile.set(null);
      this.results.set([]);
      return;
    }

    this.selectedFile.set(file);
    this.results.set([]);
  }

  /**
   * Initiates the CSV parsing and validation process.
   * Parses the selected file, validates the imported signals, and updates the results.
   * @returns {void}
   */
  protected onStart(): void {
    const file = this.selectedFile();
    if (!file) {
      return;
    }

    this.isProcessing.set(true);

    this.csvParserService
      .parse(file)
      .pipe(
        first(),
        switchMap(importedRows => this.infraSignalsService.validateImportedSignals(importedRows)),
      )
      .subscribe({
        next: validationResults => {
          this.results.set(validationResults);
          this.isProcessing.set(false);
        },
        error: () => {
          this.results.set([]);
          this.isProcessing.set(false);
        },
      });
  }

  protected onApply(): void {
    this.dialogRef.close({ acceptedSignals: this.acceptedSignals() });
  }

  protected onCancel(): void {
    this.dialogRef.close();
  }
}

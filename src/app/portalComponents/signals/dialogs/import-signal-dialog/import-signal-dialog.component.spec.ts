// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Pipe, PipeTransform } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

@Pipe({ name: 'translate', standalone: true })
class TranslatePipeStub implements PipeTransform {
  transform(value: string): string {
    return value;
  }
}

import { AdminDataEntry } from '@Ordering/api';
import { ImportedSignalValidationResult } from '@Ordering/shared/models/order-item-signal.model';
import { InfraSignalsService } from '@Ordering/portalComponents/signals/services/infra-signals.service';

import { CSVParserService } from './csv-parser.service';
import { ImportSignalDialogComponent } from './import-signal-dialog.component';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEntry(display: string): AdminDataEntry {
  return { id: `id-${display}`, display, unique: `u-${display}` };
}

function makeFile(name = 'signals.csv'): File {
  return new File(['col1,col2'], name, { type: 'text/csv' });
}

function makeFileEvent(file: File | null): Event {
  return { target: { files: file ? [file] : [] } } as unknown as Event;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('ImportSignalDialogComponent', () => {
  let fixture: ComponentFixture<ImportSignalDialogComponent>;
  let component: ImportSignalDialogComponent;
  let dialogRefMock: jest.Mocked<Pick<MatDialogRef<ImportSignalDialogComponent>, 'close'>>;
  let csvParserMock: jest.Mocked<Pick<CSVParserService, 'parse'>>;
  let signalsServiceMock: jest.Mocked<Pick<InfraSignalsService, 'validateImportedSignals'>>;

  beforeEach(async () => {
    dialogRefMock = { close: jest.fn() };
    csvParserMock = { parse: jest.fn() };
    signalsServiceMock = { validateImportedSignals: jest.fn() };

    await TestBed.configureTestingModule({
      imports: [ImportSignalDialogComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRefMock },
        { provide: CSVParserService, useValue: csvParserMock },
        { provide: InfraSignalsService, useValue: signalsServiceMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    })
      .overrideComponent(ImportSignalDialogComponent, {
        set: { imports: [TranslatePipeStub], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ImportSignalDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── Initial state ─────────────────────────────────────────────────────────

  it('should start with no selected file', () => {
    expect(component.selectedFile()).toBeNull();
  });

  it('should start with empty results', () => {
    expect(component.results()).toEqual([]);
  });

  it('should start with isProcessing false', () => {
    expect(component.isProcessing()).toBe(false);
  });

  // ── canStart computed ─────────────────────────────────────────────────────

  it('canStart should be false when no file is selected', () => {
    expect(component.canStart()).toBe(false);
  });

  it('canStart should be true when a file is selected, not processing, and no results yet', () => {
    component.selectedFile.set(makeFile());
    expect(component.canStart()).toBe(true);
  });

  it('canStart should be false while processing', () => {
    component.selectedFile.set(makeFile());
    component.isProcessing.set(true);
    expect(component.canStart()).toBe(false);
  });

  it('canStart should be false when results already exist', () => {
    component.selectedFile.set(makeFile());
    component.results.set([{ area: 'A', status: 'OK', signal: makeEntry('A') }]);
    expect(component.canStart()).toBe(false);
  });

  // ── hasProcessedResults computed ──────────────────────────────────────────

  it('hasProcessedResults should be false when results are empty', () => {
    expect(component.hasProcessedResults()).toBe(false);
  });

  it('hasProcessedResults should be true when results contain entries', () => {
    component.results.set([{ area: 'A', status: 'NOT_FOUND' }]);
    expect(component.hasProcessedResults()).toBe(true);
  });

  // ── acceptedSignals computed ──────────────────────────────────────────────

  it('acceptedSignals should include only signals from OK results', () => {
    const signal = makeEntry('A');
    component.results.set([
      { area: 'A', status: 'OK', signal },
      { area: 'B', status: 'NOT_FOUND' },
    ]);
    expect(component.acceptedSignals()).toEqual([signal]);
  });

  it('acceptedSignals should be empty when all results are NOT_FOUND', () => {
    component.results.set([{ area: 'X', status: 'NOT_FOUND' }]);
    expect(component.acceptedSignals()).toEqual([]);
  });

  // ── onFileSelected ────────────────────────────────────────────────────────

  it('should set selectedFile when a valid .csv file is chosen', () => {
    const file = makeFile('data.csv');
    component.onFileSelected(makeFileEvent(file));
    expect(component.selectedFile()).toBe(file);
  });

  it('should clear results when a new valid file is selected', () => {
    component.results.set([{ area: 'A', status: 'NOT_FOUND' }]);
    component.onFileSelected(makeFileEvent(makeFile()));
    expect(component.results()).toEqual([]);
  });

  it('should clear selectedFile when no file is provided', () => {
    component.selectedFile.set(makeFile());
    component.onFileSelected(makeFileEvent(null));
    expect(component.selectedFile()).toBeNull();
  });

  it('should reject a non-csv file and clear selectedFile', () => {
    const txtFile = makeFile('data.txt');
    component.onFileSelected(makeFileEvent(txtFile));
    expect(component.selectedFile()).toBeNull();
  });

  it('should reject a non-csv file and clear results', () => {
    component.results.set([{ area: 'A', status: 'OK', signal: makeEntry('A') }]);
    component.onFileSelected(makeFileEvent(makeFile('report.xlsx')));
    expect(component.results()).toEqual([]);
  });

  // ── onStart — no file ─────────────────────────────────────────────────────

  it('should not call csvParserService when no file is selected', () => {
    component.onStart();
    expect(csvParserMock.parse).not.toHaveBeenCalled();
  });

  // ── onStart — happy path ──────────────────────────────────────────────────

  it('should call parse with the selected file', () => {
    const file = makeFile();
    component.selectedFile.set(file);
    csvParserMock.parse.mockReturnValue(of(['A', 'B']));
    signalsServiceMock.validateImportedSignals.mockReturnValue(of([]));

    component.onStart();

    expect(csvParserMock.parse).toHaveBeenCalledWith(file);
  });

  it('should call validateImportedSignals with the parsed rows', () => {
    component.selectedFile.set(makeFile());
    csvParserMock.parse.mockReturnValue(of(['Signal A', 'Signal B']));
    signalsServiceMock.validateImportedSignals.mockReturnValue(of([]));

    component.onStart();

    expect(signalsServiceMock.validateImportedSignals).toHaveBeenCalledWith(['Signal A', 'Signal B']);
  });

  it('should set results from validateImportedSignals', () => {
    const validationResults: ImportedSignalValidationResult[] = [{ area: 'A', status: 'OK', signal: makeEntry('A') }];
    component.selectedFile.set(makeFile());
    csvParserMock.parse.mockReturnValue(of(['A']));
    signalsServiceMock.validateImportedSignals.mockReturnValue(of(validationResults));

    component.onStart();

    expect(component.results()).toEqual(validationResults);
  });

  it('should set isProcessing to false after successful validation', () => {
    component.selectedFile.set(makeFile());
    csvParserMock.parse.mockReturnValue(of([]));
    signalsServiceMock.validateImportedSignals.mockReturnValue(of([]));

    component.onStart();

    expect(component.isProcessing()).toBe(false);
  });

  // ── onStart — error path ──────────────────────────────────────────────────

  it('should clear results and stop processing when CSV parsing fails', () => {
    component.selectedFile.set(makeFile());
    component.results.set([{ area: 'old', status: 'OK', signal: makeEntry('old') }]);
    csvParserMock.parse.mockReturnValue(throwError(() => new Error('parse error')));

    component.onStart();

    expect(component.results()).toEqual([]);
    expect(component.isProcessing()).toBe(false);
  });

  // ── onApply ───────────────────────────────────────────────────────────────

  it('should close the dialog with acceptedSignals on apply', () => {
    const signal = makeEntry('A');
    component.results.set([{ area: 'A', status: 'OK', signal }]);

    component.onApply();

    expect(dialogRefMock.close).toHaveBeenCalledWith({ acceptedSignals: [signal] });
  });

  it('should close the dialog with empty acceptedSignals when no OK results exist', () => {
    component.results.set([{ area: 'B', status: 'NOT_FOUND' }]);

    component.onApply();

    expect(dialogRefMock.close).toHaveBeenCalledWith({ acceptedSignals: [] });
  });

  // ── onCancel ──────────────────────────────────────────────────────────────

  it('should close the dialog without a value on cancel', () => {
    component.onCancel();
    expect(dialogRefMock.close).toHaveBeenCalledWith();
  });
});

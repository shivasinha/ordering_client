import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';

import { AdminDataEntry } from '@Ordering/api';
import { TranslationsService } from '@Ordering/core/services/translations.service';

import { AddSignalDialogComponent } from '../dialogs/add-signal-dialog/add-signal-dialog.component';
import { ImportSignalDialogComponent } from '../dialogs/import-signal-dialog/import-signal-dialog.component';
import { SignalsSlotService } from './signals-slot.service';

describe('SignalsSlotService', () => {
  let service: SignalsSlotService;
  let dialogMock: jest.Mocked<MatDialog>;
  let trMock: jest.Mocked<TranslationsService>;

  const mockDialogRef = (result: unknown) => ({ afterClosed: () => of(result) }) as unknown as MatDialogRef<unknown>;

  beforeEach(() => {
    dialogMock = { open: jest.fn() } as unknown as jest.Mocked<MatDialog>;
    trMock = { translate: jest.fn((key: string) => key) } as unknown as jest.Mocked<TranslationsService>;

    TestBed.configureTestingModule({
      providers: [SignalsSlotService, { provide: MatDialog, useValue: dialogMock }, { provide: TranslationsService, useValue: trMock }],
    });

    service = TestBed.inject(SignalsSlotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    TestBed.resetTestingModule();
  });

  describe('display strings', () => {
    it('should translate sectionLabel on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblSignals');
      expect(service.sectionLabel).toBe('lblSignals');
    });

    it('should translate noDataMessage on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblNoSignals');
      expect(service.noDataMessage).toBe('lblNoSignals');
    });

    it('should translate editTooltip on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblEditSignal');
      expect(service.editTooltip).toBe('lblEditSignal');
    });

    it('should translate deleteTooltip on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblDeleteSignal');
      expect(service.deleteTooltip).toBe('lblDeleteSignal');
    });

    it('should translate addLabel on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblAddSignal');
      expect(service.addLabel).toBe('lblAddSignal');
    });

    it('should translate importLabel on construction', () => {
      expect(trMock.translate).toHaveBeenCalledWith('lblImportSignal');
      expect(service.importLabel).toBe('lblImportSignal');
    });
  });

  describe('getColumns()', () => {
    it('should return one column with field "display" and translated header', () => {
      const columns = service.getColumns();

      expect(columns).toHaveLength(1);
      expect(columns[0].field).toBe('display');
      expect(columns[0].colHeader).toBe('lblArea');
      expect(columns[0].sortable).toBe(true);
    });
  });

  describe('openEditDialog()', () => {
    const item: AdminDataEntry = { display: 'Signal A' } as AdminDataEntry;

    it('should open AddSignalDialogComponent with width 800px and singleSelection true', () => {
      dialogMock.open.mockReturnValue(mockDialogRef(undefined));

      service.openEditDialog(item).subscribe();

      expect(dialogMock.open).toHaveBeenCalledWith(AddSignalDialogComponent, {
        width: '800px',
        data: { preselectedSignals: [item], singleSelection: true },
      });
    });

    it('should emit the first element of the dialog result', done => {
      const returned: AdminDataEntry = { display: 'Signal B' } as AdminDataEntry;
      dialogMock.open.mockReturnValue(mockDialogRef([returned]));

      service.openEditDialog(item).subscribe(result => {
        expect(result).toEqual(returned);
        done();
      });
    });

    it('should emit null when dialog is dismissed (undefined result)', done => {
      dialogMock.open.mockReturnValue(mockDialogRef(undefined));

      service.openEditDialog(item).subscribe(result => {
        expect(result).toBeNull();
        done();
      });
    });

    it('should emit null when dialog returns an empty array', done => {
      dialogMock.open.mockReturnValue(mockDialogRef([]));

      service.openEditDialog(item).subscribe(result => {
        expect(result).toBeNull();
        done();
      });
    });
  });

  describe('openAddDialog()', () => {
    it('should open AddSignalDialogComponent with width 800px and singleSelection false', () => {
      dialogMock.open.mockReturnValue(mockDialogRef(undefined));

      service.openAddDialog().subscribe();

      expect(dialogMock.open).toHaveBeenCalledWith(AddSignalDialogComponent, {
        width: '800px',
        data: { singleSelection: false },
      });
    });

    it('should emit the selected signals array', done => {
      const signals: AdminDataEntry[] = [{ display: 'S1' } as AdminDataEntry, { display: 'S2' } as AdminDataEntry];
      dialogMock.open.mockReturnValue(mockDialogRef(signals));

      service.openAddDialog().subscribe(result => {
        expect(result).toEqual(signals);
        done();
      });
    });

    it('should emit an empty array when dialog is dismissed (undefined result)', done => {
      dialogMock.open.mockReturnValue(mockDialogRef(undefined));

      service.openAddDialog().subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
    });
  });

  describe('openImportDialog()', () => {
    it('should open ImportSignalDialogComponent with width 600px', () => {
      dialogMock.open.mockReturnValue(mockDialogRef(undefined));

      service.openImportDialog().subscribe();

      expect(dialogMock.open).toHaveBeenCalledWith(ImportSignalDialogComponent, { width: '600px' });
    });

    it('should emit acceptedSignals from the dialog result', done => {
      const accepted: AdminDataEntry[] = [{ display: 'Imported' } as AdminDataEntry];
      dialogMock.open.mockReturnValue(mockDialogRef({ acceptedSignals: accepted }));

      service.openImportDialog().subscribe(result => {
        expect(result).toEqual(accepted);
        done();
      });
    });

    it('should emit an empty array when dialog is dismissed (undefined result)', done => {
      dialogMock.open.mockReturnValue(mockDialogRef(undefined));

      service.openImportDialog().subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
    });

    it('should emit an empty array when acceptedSignals is missing', done => {
      dialogMock.open.mockReturnValue(mockDialogRef({}));

      service.openImportDialog().subscribe(result => {
        expect(result).toEqual([]);
        done();
      });
    });
  });
});
